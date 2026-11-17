export type CiState =
  | 'queued'
  | 'running'
  | 'passed'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'interrupted'
export type CiCode =
  | 'none'
  | 'checks_failed'
  | 'integrity_failed'
  | 'validator_exception'
  | 'input_limit'
  | 'work_limit'
  | 'output_limit'
  | 'deadline'
  | 'cancelled'
  | 'recovered'
  | 'attempts_exhausted'
  | 'pipeline_unavailable'
  | 'generation_exhausted'
export interface CiPipeline {
  readonly id: 'miniagentgit-ci-v1'
  readonly version: number
  readonly fingerprint: string
}
export interface CiJob {
  readonly id: string
  readonly repositoryId: string
  readonly commitId: string
  readonly pipeline: CiPipeline
  readonly state: CiState
  readonly generation: number
  readonly attempts: number
  readonly createdAt: number
  readonly updatedAt: number
  readonly deadline: number
  readonly code: CiCode
}
export interface CiDiagnostic {
  readonly check: 'manifest' | 'source' | 'syntax' | 'lint' | 'imports'
  readonly code: string
  readonly path?: string
  readonly line?: number
}
export type CiCheckState = 'passed' | 'failed' | 'skipped'
export interface CiValidation {
  readonly state: 'passed' | 'failed'
  readonly code: CiCode
  readonly checks: {
    readonly manifest: CiCheckState
    readonly source: 'passed' | 'failed' | 'skipped'
    readonly syntax?: CiCheckState
    readonly lint?: CiCheckState
    readonly imports?: CiCheckState
    readonly typescript: 'deferred'
  }
  readonly diagnostics: readonly CiDiagnostic[]
  readonly truncated: boolean
  readonly files: number
  readonly bytes: number
  readonly work: number
}
export interface CiReceipt extends CiValidation {
  readonly schemaVersion: 1 | 2
  readonly jobId: string
  readonly repositoryId: string
  readonly commitId: string
  readonly pipeline: CiPipeline
  readonly generation: number
  readonly completedAt: number
  readonly terminalState: Exclude<CiState, 'queued' | 'running'>
}
export interface CiSnapshotEntry {
  readonly path: string
  readonly hash: string
  readonly bytes: number
  readonly content: string | null
}
export interface CiSnapshot {
  readonly repositoryId: string
  readonly commitId: string
  readonly manifestHash: string | null
  readonly canonicalCommit: string
  readonly entries: readonly CiSnapshotEntry[]
}
