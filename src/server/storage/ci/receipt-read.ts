import type {
  CiJob,
  CiReceipt,
  CiDiagnostic,
  CiCheckState,
} from '../../../contracts/ci'
import { objectValue, filePath } from '../../../domain/validation'
import { numberColumn, stringColumn } from '../database'
import { codeValue, stateValue } from './rows'

function checkState(value: unknown): value is CiCheckState {
  return value === 'passed' || value === 'failed' || value === 'skipped'
}

export function readReceipt(payload: string, job: CiJob): CiReceipt {
  const version = job.pipeline.version === 3 ? 2 : 1
  const data: unknown = JSON.parse(payload)
  if (
    !objectValue(data) ||
    data.schemaVersion !== version ||
    data.jobId !== job.id ||
    data.repositoryId !== job.repositoryId ||
    data.commitId !== job.commitId ||
    !objectValue(data.pipeline) ||
    data.pipeline.id !== job.pipeline.id ||
    data.pipeline.version !== job.pipeline.version ||
    data.pipeline.fingerprint !== job.pipeline.fingerprint ||
    data.generation !== job.generation ||
    !objectValue(data.checks) ||
    !['passed', 'failed'].includes(String(data.state)) ||
    !Array.isArray(data.diagnostics) ||
    data.diagnostics.length > 16 ||
    typeof data.truncated !== 'boolean'
  )
    throw new Error('Invalid CI receipt')
  const checks = data.checks
  if (
    !checkState(checks.manifest) ||
    (version === 1 && checks.manifest === 'skipped') ||
    (checks.source !== 'passed' &&
      checks.source !== 'failed' &&
      checks.source !== 'skipped') ||
    checks.typescript !== 'deferred'
  )
    throw new Error('Invalid CI checks')
  const { syntax, lint, imports } = checks
  const analysis =
    checkState(syntax) && checkState(lint) && checkState(imports)
      ? { syntax, lint, imports }
      : undefined
  if (
    version === 2 &&
    (!analysis ||
      (job.state === 'passed' &&
        (syntax !== 'passed' || lint !== 'passed' || imports !== 'passed')))
  )
    throw new Error('Invalid analysis checks')
  const terminalState = stateValue(stringColumn(data, 'terminalState'))
  if (
    terminalState === 'queued' ||
    terminalState === 'running' ||
    terminalState !== job.state
  )
    throw new Error('Invalid terminal CI receipt')
  const diagnostics: CiDiagnostic[] = data.diagnostics.map((value: unknown) => {
    if (
      !objectValue(value) ||
      (value.check !== 'manifest' &&
        value.check !== 'source' &&
        !(
          version === 2 &&
          (value.check === 'syntax' ||
            value.check === 'lint' ||
            value.check === 'imports')
        )) ||
      typeof value.code !== 'string' ||
      !/^[a-z_]{1,64}$/.test(value.code)
    )
      throw new Error('Invalid CI diagnostic')
    if (value.path !== undefined && !filePath(value.path).ok)
      throw new Error('Invalid CI diagnostic path')
    return {
      check: value.check,
      code: value.code,
      ...(typeof value.path === 'string' ? { path: value.path } : {}),
      ...(value.line !== undefined
        ? { line: numberColumn(value, 'line') }
        : {}),
    }
  })
  return {
    schemaVersion: version,
    jobId: job.id,
    repositoryId: job.repositoryId,
    commitId: job.commitId,
    pipeline: job.pipeline,
    generation: job.generation,
    completedAt: numberColumn(data, 'completedAt'),
    terminalState,
    state: data.state === 'passed' ? 'passed' : 'failed',
    code: codeValue(stringColumn(data, 'code')),
    checks: {
      manifest: checks.manifest,
      source: checks.source,
      typescript: 'deferred',
      ...(version === 2 ? analysis : undefined),
    },
    diagnostics,
    truncated: data.truncated,
    files: numberColumn(data, 'files'),
    bytes: numberColumn(data, 'bytes'),
    work: numberColumn(data, 'work'),
  }
}
