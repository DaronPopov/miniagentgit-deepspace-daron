import type { CiJob } from '../../contracts/ci'
import { objectValue } from '../../domain/validation'

export const stageBounds = Object.freeze({
  elapsedMs: 30_000,
  stageMs: 2000,
  dispatchLeaseMs: 3000,
  dispatchAttempts: 2,
  continuationMs: 100,
  checkpointBytes: 4096,
})
export type CiStage = 'integrity' | 'source-policy'
export type StageReply = 'continue' | 'done' | 'stale'
export interface CiDispatch {
  readonly repositoryId: string
  readonly ciJobId: string
  readonly commitId: string
  readonly pipelineFingerprint: string
  readonly generation: number
}
export const dispatchFor = (job: CiJob): CiDispatch => ({
  repositoryId: job.repositoryId,
  ciJobId: job.id,
  commitId: job.commitId,
  pipelineFingerprint: job.pipeline.fingerprint,
  generation: job.generation,
})
export function validDispatch(value: unknown): value is CiDispatch {
  return (
    objectValue(value) &&
    Object.keys(value).length === 5 &&
    typeof value.repositoryId === 'string' &&
    /^repo_[a-z0-9]{16,32}$/.test(value.repositoryId) &&
    typeof value.ciJobId === 'string' &&
    /^ci_[a-f0-9]{64}$/.test(value.ciJobId) &&
    typeof value.commitId === 'string' &&
    /^[a-f0-9]{64}$/.test(value.commitId) &&
    typeof value.pipelineFingerprint === 'string' &&
    /^[a-f0-9]{64}$/.test(value.pipelineFingerprint) &&
    (value.generation === 1 || value.generation === 2)
  )
}
