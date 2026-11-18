import { hash, id, page, record, uint } from './repository-data'

export function jobId(value: unknown): value is string {
  return typeof value === 'string' && /^ci_[a-f0-9]{64}$/.test(value)
}
function pipeline(value: unknown) {
  if (
    !record(value) ||
    value.id !== 'miniagentgit-ci-v1' ||
    !uint(value.version) ||
    !hash(value.fingerprint)
  )
    return
  return {
    id: value.id,
    version: value.version,
    fingerprint: value.fingerprint,
  }
}
const timestamp = (value: unknown): value is number =>
  uint(value) && value <= 8.64e15
const terminals = ['passed', 'failed', 'cancelled', 'expired', 'interrupted']
export function job(value: unknown) {
  if (
    !record(value) ||
    !jobId(value.id) ||
    !id(value.repositoryId) ||
    !hash(value.commitId) ||
    typeof value.state !== 'string' ||
    !['queued', 'running', ...terminals].includes(value.state) ||
    !uint(value.attempts) ||
    !timestamp(value.updatedAt) ||
    !uint(value.generation) ||
    typeof value.code !== 'string'
  )
    return
  const check = pipeline(value.pipeline)
  if (!check) return
  return {
    id: value.id,
    repositoryId: value.repositoryId,
    commitId: value.commitId,
    state: value.state,
    pipeline: check,
    attempts: value.attempts,
    updatedAt: value.updatedAt,
    generation: value.generation,
    code: value.code,
  }
}
export const jobsPage = (value: unknown) => page(value, job, 4)

function diagnostic(value: unknown) {
  if (
    !record(value) ||
    typeof value.check !== 'string' ||
    typeof value.code !== 'string' ||
    (value.path !== undefined && typeof value.path !== 'string') ||
    (value.line !== undefined && !uint(value.line))
  )
    return
  return {
    check: value.check,
    code: value.code,
    path: value.path,
    line: value.line,
  }
}
const checkState = (value: unknown): value is 'passed' | 'failed' | 'skipped' =>
  value === 'passed' || value === 'failed' || value === 'skipped'
export function receipt(value: unknown) {
  if (
    !record(value) ||
    (value.schemaVersion !== 1 && value.schemaVersion !== 2) ||
    !jobId(value.jobId) ||
    !id(value.repositoryId) ||
    !hash(value.commitId) ||
    typeof value.terminalState !== 'string' ||
    !terminals.includes(value.terminalState) ||
    typeof value.code !== 'string' ||
    !uint(value.generation) ||
    !timestamp(value.completedAt) ||
    !uint(value.files) ||
    !uint(value.bytes) ||
    !uint(value.work) ||
    typeof value.truncated !== 'boolean' ||
    !Array.isArray(value.diagnostics) ||
    value.diagnostics.length > 16 ||
    !record(value.checks)
  )
    return
  const definition = pipeline(value.pipeline)
  const { manifest, source, syntax, lint, imports, typescript } = value.checks
  const analysis =
    checkState(syntax) && checkState(lint) && checkState(imports)
      ? { syntax, lint, imports }
      : undefined
  if (
    !definition ||
    !checkState(manifest) ||
    !checkState(source) ||
    typescript !== 'deferred' ||
    (value.schemaVersion === 2 && !analysis)
  )
    return
  const diagnostics = value.diagnostics.map(diagnostic)
  if (diagnostics.some((item) => item === undefined)) return
  return {
    schemaVersion: value.schemaVersion,
    jobId: value.jobId,
    repositoryId: value.repositoryId,
    commitId: value.commitId,
    terminalState: value.terminalState,
    pipeline: definition,
    code: value.code,
    generation: value.generation,
    completedAt: value.completedAt,
    files: value.files,
    bytes: value.bytes,
    work: value.work,
    truncated: value.truncated,
    diagnostics: diagnostics.filter((item) => item !== undefined),
    checks: {
      manifest,
      source,
      ...(value.schemaVersion === 2 ? analysis : undefined),
      typescript,
    },
  }
}
