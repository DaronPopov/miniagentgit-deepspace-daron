import type { RepositoryContext } from '../operations'
import type { Result } from '../../domain/result'
import type {
  CiJob,
  CiPipeline,
  CiReceipt,
  CiSnapshot,
  CiValidation,
} from '../../contracts/ci'

export interface CiStore {
  readonly admit: (
    context: RepositoryContext,
    commit: string,
    pipeline: CiPipeline,
    jobId: string,
  ) => Result<CiJob>
  readonly get: (context: RepositoryContext, job: string) => Result<CiJob>
  readonly receipt: (
    context: RepositoryContext,
    job: string,
  ) => Result<CiReceipt>
  readonly list: (
    context: RepositoryContext,
    offset: number,
    limit: number,
    commit?: string,
  ) => Result<{
    readonly items: readonly CiJob[]
    readonly nextCursor: string | null
  }>
  readonly recover: (context: RepositoryContext) => Result<null>
  readonly claim: (
    context: RepositoryContext,
    pipeline: CiPipeline,
  ) => Result<CiJob | null>
  readonly snapshot: (
    context: RepositoryContext,
    job: CiJob,
  ) => Result<CiSnapshot>
  readonly finish: (
    context: RepositoryContext,
    job: CiJob,
    result: CiValidation,
  ) => Result<CiJob>
  readonly stop: (
    context: RepositoryContext,
    job: string,
    reason: 'cancelled' | 'expired',
    generation?: number,
  ) => Result<CiJob>
}
