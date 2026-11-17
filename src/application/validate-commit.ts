import type { CommitRequest, FileChange } from '../domain/repository'
import { invalid, success } from '../domain/result'
import type { Result } from '../domain/result'
import {
  commitId,
  filePath,
  idempotencyKey,
  objectValue,
} from '../domain/validation'
import { FREE_TIER_LIMITS, utf8Bytes, withinQuota } from './resource-limits'
import type { ResourceLimits } from './resource-limits'

export function validateCommit(
  value: unknown,
  limits: ResourceLimits = FREE_TIER_LIMITS,
): Result<CommitRequest> {
  if (
    !objectValue(value) ||
    Object.keys(value).some(
      (key) =>
        !['expectedHead', 'idempotencyKey', 'message', 'changes'].includes(key),
    )
  ) {
    return invalid('Expected commit request with no ownership claims')
  }
  if (value.expectedHead !== null) {
    const head = commitId(value.expectedHead)
    if (!head.ok) return head
  }
  const key = idempotencyKey(value.idempotencyKey)
  if (!key.ok) return key
  if (
    typeof value.message !== 'string' ||
    value.message.trim().length === 0 ||
    value.message.includes('\0') ||
    new TextDecoder().decode(new TextEncoder().encode(value.message)) !==
      value.message
  ) {
    return invalid('Expected nonempty commit message')
  }
  const messageQuota = withinQuota(
    'messageBytes',
    utf8Bytes(value.message),
    limits.messageBytes,
  )
  if (!messageQuota.ok) return messageQuota
  if (!Array.isArray(value.changes) || value.changes.length === 0)
    return invalid('Expected changes')
  const countQuota = withinQuota(
    'changesPerCommit',
    value.changes.length,
    limits.changesPerCommit,
  )
  if (!countQuota.ok) return countQuota
  const changes: FileChange[] = []
  const paths = new Set<string>()
  let total = 0
  for (const item of value.changes) {
    if (!objectValue(item)) return invalid('Invalid change')
    const path = filePath(item.path)
    if (!path.ok) return path
    if (paths.has(path.value)) return invalid('Duplicate file path')
    paths.add(path.value)
    if (item.kind === 'put') {
      if (
        Object.keys(item).some(
          (key) => !['kind', 'path', 'text'].includes(key),
        ) ||
        typeof item.text !== 'string' ||
        item.text.includes('\0') ||
        new TextDecoder().decode(new TextEncoder().encode(item.text)) !==
          item.text
      ) {
        return invalid('Expected well-formed text without NUL')
      }
      const size = utf8Bytes(item.text)
      const quota = withinQuota('fileBytes', size, limits.fileBytes)
      if (!quota.ok) return quota
      total += size
      changes.push({ kind: 'put', path: path.value, text: item.text })
    } else if (
      item.kind === 'delete' &&
      Object.keys(item).every((key) => ['kind', 'path'].includes(key))
    ) {
      changes.push({ kind: 'delete', path: path.value })
    } else return invalid('Invalid change kind or fields')
  }
  const quota = withinQuota('commitTextBytes', total, limits.commitTextBytes)
  if (!quota.ok) return quota
  // expectedHead was validated above; narrow the unknown without an assertion.
  if (value.expectedHead !== null && typeof value.expectedHead !== 'string')
    return invalid('Invalid HEAD')
  return success({
    expectedHead: value.expectedHead,
    idempotencyKey: key.value,
    message: value.message,
    changes,
  })
}
