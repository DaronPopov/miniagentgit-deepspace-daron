import type { CiCode, CiJob, CiState } from '../../../contracts/ci'
import type { SqlRow } from '../database'
import { numberColumn, stringColumn } from '../database'

const STATES: readonly CiState[] = [
  'queued',
  'running',
  'passed',
  'failed',
  'cancelled',
  'expired',
  'interrupted',
]
const CODES: readonly CiCode[] = [
  'none',
  'checks_failed',
  'integrity_failed',
  'validator_exception',
  'input_limit',
  'work_limit',
  'output_limit',
  'deadline',
  'cancelled',
  'recovered',
  'attempts_exhausted',
  'pipeline_unavailable',
  'generation_exhausted',
]
export function stateValue(value: string): CiState {
  for (const state of STATES) if (state === value) return state
  throw new Error('Invalid persisted CI state')
}
export function codeValue(value: string): CiCode {
  for (const code of CODES) if (code === value) return code
  throw new Error('Invalid persisted CI code')
}
export function jobRow(row: SqlRow): CiJob {
  if (row.pipeline_id !== 'miniagentgit-ci-v1')
    throw new Error('Unsupported persisted pipeline')
  return Object.freeze({
    id: stringColumn(row, 'id'),
    repositoryId: stringColumn(row, 'repository_id'),
    commitId: stringColumn(row, 'commit_id'),
    pipeline: Object.freeze({
      id: 'miniagentgit-ci-v1',
      version: numberColumn(row, 'pipeline_version'),
      fingerprint: stringColumn(row, 'fingerprint'),
    }),
    state: stateValue(stringColumn(row, 'state')),
    code: codeValue(stringColumn(row, 'code')),
    generation: numberColumn(row, 'generation'),
    attempts: numberColumn(row, 'attempts'),
    createdAt: numberColumn(row, 'created_ms'),
    updatedAt: numberColumn(row, 'updated_ms'),
    deadline: numberColumn(row, 'deadline_ms'),
  })
}
export const terminal = (job: CiJob) =>
  job.state !== 'queued' && job.state !== 'running'
export const nextGeneration = (job: CiJob) =>
  job.generation < Number.MAX_SAFE_INTEGER ? job.generation + 1 : job.generation
