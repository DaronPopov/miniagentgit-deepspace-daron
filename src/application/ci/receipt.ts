import type {
  CiCode,
  CiJob,
  CiReceipt,
  CiState,
  CiValidation,
} from '../../contracts/ci'
import { failedValidation } from './validation'
import type { CiLimits } from './limits'

export function ciReceipt(
  job: CiJob,
  state: Exclude<CiState, 'queued' | 'running'>,
  code: CiCode,
  now: number,
  limits: CiLimits,
  validation?: CiValidation,
): CiReceipt {
  const expanded = job.pipeline.version === 3
  const baseline = (reason: CiCode): CiValidation => {
    const failed = failedValidation(reason)
    return expanded
      ? { ...failed, checks: { ...failed.checks, manifest: 'skipped' } }
      : failed
  }
  validation ??= baseline(code)
  const validPass =
    validation.code === 'none' &&
    [validation.files, validation.bytes, validation.work].every(
      (n) => Number.isSafeInteger(n) && n >= 0,
    ) &&
    validation.files <= limits.files &&
    validation.bytes <= limits.inputBytes &&
    validation.work <= limits.workBytes &&
    validation.state === 'passed' &&
    validation.checks.manifest === 'passed' &&
    validation.checks.source === 'passed' &&
    (!expanded ||
      (validation.checks.syntax === 'passed' &&
        validation.checks.lint === 'passed' &&
        validation.checks.imports === 'passed')) &&
    validation.diagnostics.length === 0 &&
    !validation.truncated
  const safe: CiValidation =
    state === 'passed' && !validPass
      ? failedValidation('validator_exception')
      : validation
  const checks = (value: CiValidation): CiValidation['checks'] =>
    expanded
      ? {
          syntax: 'skipped',
          lint: 'skipped',
          imports: 'skipped',
          ...value.checks,
        }
      : value.checks
  const result: CiReceipt = {
    ...safe,
    checks: checks(safe),
    schemaVersion: expanded ? 2 : 1,
    jobId: job.id,
    repositoryId: job.repositoryId,
    commitId: job.commitId,
    pipeline: job.pipeline,
    generation: job.generation,
    completedAt: now,
    terminalState: state === 'passed' && !validPass ? 'failed' : state,
  }
  if (
    validation.diagnostics.length > limits.diagnostics ||
    new TextEncoder().encode(JSON.stringify(validation.diagnostics)).length >
      limits.diagnosticBytes ||
    new TextEncoder().encode(JSON.stringify(result)).length >
      limits.receiptBytes
  ) {
    return {
      ...result,
      ...failedValidation('output_limit'),
      checks: checks(failedValidation('output_limit')),
      terminalState: 'failed',
    }
  }
  return Object.freeze(result)
}
