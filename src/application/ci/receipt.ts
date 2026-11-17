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
  validation = failedValidation(code),
): CiReceipt {
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
    validation.diagnostics.length === 0 &&
    !validation.truncated
  const safe: CiValidation =
    state === 'passed' && !validPass
      ? failedValidation('validator_exception')
      : validation
  const result: CiReceipt = {
    ...safe,
    schemaVersion: 1,
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
      terminalState: 'failed',
    }
  }
  return Object.freeze(result)
}
