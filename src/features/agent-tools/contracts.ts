import { commitId, objectValue, repositoryId } from '../../domain/validation'
import { invalid, success } from '../../domain/result'
import type { Result } from '../../domain/result'
import type { RepositoryHead } from '../../domain/repository'

export const REPOSITORY_HEAD_TOOL = 'miniagentgit.repository_head'
import { FREE_TIER_LIMITS } from '../../application/resource-limits'

export const TOOL_REQUEST_BYTES = FREE_TIER_LIMITS.requestBytes
export const TOOL_RESULT_BYTES = 1024
export interface RepositoryHeadInput {
  readonly repositoryId: string
}
export interface RepositoryHeadResult
  extends RepositoryHeadInput, RepositoryHead {}
export type HeadReader = (id: string) => Promise<Result<RepositoryHead>>

export function validateHeadInput(value: unknown): Result<RepositoryHeadInput> {
  if (!objectValue(value) || Object.keys(value).length !== 1)
    return invalid('Expected only repositoryId')
  const id = repositoryId(value.repositoryId)
  return id.ok
    ? success({ repositoryId: id.value })
    : invalid('Invalid repositoryId')
}
export function validateHead(value: unknown): Result<RepositoryHead> {
  if (
    !objectValue(value) ||
    Object.keys(value).length !== 2 ||
    !(value.commitId === null || commitId(value.commitId).ok) ||
    typeof value.version !== 'number' ||
    !Number.isSafeInteger(value.version) ||
    value.version < 0 ||
    (value.commitId === null) !== (value.version === 0)
  )
    return invalid('Invalid HEAD result')
  // Validate the string branch explicitly so no assertion or unknown field escapes.
  const commit =
    value.commitId === null ? success(null) : commitId(value.commitId)
  return commit.ok
    ? success({ commitId: commit.value, version: value.version })
    : commit
}
export function validateHeadResult(
  value: unknown,
): Result<RepositoryHeadResult> {
  if (!objectValue(value) || Object.keys(value).length !== 3)
    return invalid('Invalid tool result')
  const id = repositoryId(value.repositoryId)
  const head = validateHead({
    commitId: value.commitId,
    version: value.version,
  })
  return id.ok && head.ok
    ? success({ repositoryId: id.value, ...head.value })
    : invalid('Invalid tool result')
}
