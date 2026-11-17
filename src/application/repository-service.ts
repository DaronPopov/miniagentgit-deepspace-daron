import type { RepositoryOperations, RepositoryContext } from './operations'
import type {
  Principal,
  RepositoryMetadata,
  CommitMetadata,
  CommitRequest,
} from '../domain/repository'
import type { Result } from '../domain/result'

export type RepositoryService = Pick<
  RepositoryOperations,
  'readRepository' | 'readHead' | 'listTree' | 'readFile' | 'readCommit'
> & {
  readonly createCommit: (
    context: RepositoryContext,
    input: CommitRequest,
    signal?: AbortSignal,
  ) => Promise<Result<CommitMetadata>>
  readonly initialize: (
    actor: Principal,
    input: unknown,
  ) => Promise<Result<RepositoryMetadata>>
  readonly replay: (
    context: RepositoryContext,
    key: string,
  ) => Promise<Result<CommitMetadata>>
}
