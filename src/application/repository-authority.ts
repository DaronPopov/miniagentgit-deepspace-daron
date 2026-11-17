import type {
  CommitMetadata,
  CommitRequest,
  FileManifest,
  Principal,
  RepositoryMetadata,
  RepositoryHead,
} from '../domain/repository'
import type { RepositoryContext } from './operations'
import type { Result } from '../domain/result'

export interface PreparedCommit {
  readonly manifestHash: string
  readonly canonical: string
  readonly contents: readonly {
    readonly hash: string
    readonly text: string
    readonly utf8Bytes: number
  }[]
  readonly request: CommitRequest
  readonly metadata: CommitMetadata
  readonly manifest: FileManifest
  readonly requestDigest: string
}
/**
 * One owner per repository. This is the sole future mutation seam.
 * It must recheck authorization, quotas, idempotency and expected HEAD inside
 * one synchronous SQLite transaction; no await or external storage in closure.
 */
export interface RepositoryAuthority {
  readonly commitPrepared: (
    context: RepositoryContext,
    commit: PreparedCommit,
  ) => Promise<Result<CommitMetadata>>
}

/** Read port bound to one repository; implementation must authorize each call. */
export interface RepositoryReader {
  readonly metadata: (actor: Principal) => Promise<Result<RepositoryMetadata>>
  readonly head: (actor: Principal) => Promise<Result<RepositoryHead>>
}
