import { invalid, success } from '../domain/result'
import type { Result } from '../domain/result'
import {
  commitId,
  idempotencyKey,
  objectValue,
  repositoryName,
} from '../domain/validation'
import type { PageRequest } from './operations'
import type { ResourceLimits } from './resource-limits'
import { FREE_TIER_LIMITS, withinQuota } from './resource-limits'

export function validateCreateRepository(
  value: unknown,
): Result<{ readonly name: string; readonly idempotencyKey: string }> {
  if (
    !objectValue(value) ||
    Object.keys(value).some((key) => !['name', 'idempotencyKey'].includes(key))
  )
    return invalid('Invalid repository request')
  const name = repositoryName(value.name)
  if (!name.ok) return name
  const key = idempotencyKey(value.idempotencyKey)
  return key.ok ? success({ name: name.value, idempotencyKey: key.value }) : key
}

export function validatePage(
  value: unknown,
  limits: ResourceLimits = FREE_TIER_LIMITS,
): Result<PageRequest> {
  if (
    !objectValue(value) ||
    Object.keys(value).some((key) => !['cursor', 'limit'].includes(key))
  )
    return invalid('Invalid page request')
  if (
    value.cursor !== null &&
    (typeof value.cursor !== 'string' ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(value.cursor))
  )
    return invalid('Invalid page cursor')
  if (
    typeof value.limit !== 'number' ||
    !Number.isSafeInteger(value.limit) ||
    value.limit < 1
  )
    return invalid('Invalid page size')
  const quota = withinQuota('pageSize', value.limit, limits.pageSize)
  return quota.ok
    ? success({ cursor: value.cursor, limit: value.limit })
    : quota
}

export function validateRestore(value: unknown): Result<{
  readonly source: string
  readonly expectedHead: string | null
  readonly idempotencyKey: string
}> {
  if (
    !objectValue(value) ||
    Object.keys(value).some(
      (key) => !['source', 'expectedHead', 'idempotencyKey'].includes(key),
    )
  )
    return invalid('Invalid restore request')
  const source = commitId(value.source)
  if (!source.ok) return source
  const key = idempotencyKey(value.idempotencyKey)
  if (!key.ok) return key
  const head =
    value.expectedHead === null ? success(null) : commitId(value.expectedHead)
  return head.ok
    ? success({
        source: source.value,
        expectedHead: head.value,
        idempotencyKey: key.value,
      })
    : head
}
