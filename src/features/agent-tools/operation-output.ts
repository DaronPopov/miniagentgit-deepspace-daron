import { CI_DEFAULT_LIMITS } from '../../application/ci/limits'
import { utf8Bytes } from '../../application/resource-limits'
import { objectValue } from '../../domain/validation'
import { matches } from './json-schema'
import type { Operation } from './operation-inputs'
import { operationOutputs } from './operation-schemas'

export const resultBytes = {
  repository_create: 1024,
  repository_commit: 6656,
  ci_request: 1024,
  ci_status: 1024,
  ci_receipt: CI_DEFAULT_LIMITS.receiptBytes,
} as const

export function validOutput(operation: Operation, value: unknown) {
  return (
    matches(operationOutputs[operation], value) &&
    utf8Bytes(JSON.stringify(value)) <= resultBytes[operation]
  )
}

export function projectOutput(operation: Operation, value: unknown) {
  if (!objectValue(value)) return value
  if (operation === 'repository_create') {
    const { id, name, createdAt } = value
    return { id, name, createdAt }
  }
  if (operation === 'repository_commit') {
    const { id, parentId, message, createdAt } = value
    return { id, parentId, message, createdAt }
  }
  return value
}
