import type {
  CommitId,
  CommitMetadata,
  CommitRequest,
  FileManifest,
  FilePath,
  Principal,
  RepositoryHead,
  RepositoryId,
  RepositoryMetadata,
  IdempotencyKey,
} from '../domain/repository'
import type { Result } from '../domain/result'

export interface RepositoryContext {
  readonly repositoryId: RepositoryId
  readonly actor: Principal
}
export interface PageRequest {
  readonly cursor: string | null
  readonly limit: number
}
export interface Page<T> {
  readonly items: readonly T[]
  readonly nextCursor: string | null
}
export interface DiffEntry {
  readonly path: FilePath
  readonly kind: 'added' | 'modified' | 'deleted'
}

/** Seams only. No default implementation or success stub. */
export interface RepositoryOperations {
  readonly createRepository: (
    actor: Principal,
    input: { readonly name: string; readonly idempotencyKey: IdempotencyKey },
  ) => Promise<Result<RepositoryMetadata>>
  readonly readRepository: (
    context: RepositoryContext,
  ) => Promise<Result<RepositoryMetadata>>
  readonly readHead: (
    context: RepositoryContext,
  ) => Promise<Result<RepositoryHead>>
  readonly listTree: (
    context: RepositoryContext,
    commit: CommitId | null,
    page: PageRequest,
  ) => Promise<Result<Page<FileManifest[number]>>>
  readonly readFile: (
    context: RepositoryContext,
    commit: CommitId,
    path: FilePath,
  ) => Promise<Result<string>>
  readonly createCommit: (
    context: RepositoryContext,
    input: CommitRequest,
  ) => Promise<Result<CommitMetadata>>
  readonly readHistory: (
    context: RepositoryContext,
    page: PageRequest,
  ) => Promise<Result<Page<CommitMetadata>>>
  readonly readCommit: (
    context: RepositoryContext,
    commit: CommitId,
  ) => Promise<Result<CommitMetadata>>
  readonly calculateDiff: (
    context: RepositoryContext,
    from: CommitId,
    to: CommitId,
    page: PageRequest,
  ) => Promise<Result<Page<DiffEntry>>>
  readonly restore: (
    context: RepositoryContext,
    input: {
      readonly source: CommitId
      readonly expectedHead: CommitId | null
      readonly idempotencyKey: IdempotencyKey
    },
  ) => Promise<Result<CommitMetadata>>
}
