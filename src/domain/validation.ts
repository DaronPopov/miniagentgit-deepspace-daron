import { invalid, success } from './result'
import type { Result } from './result'

export function objectValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
export function repositoryId(value: unknown): Result<string> {
  return typeof value === 'string' && /^repo_[a-z0-9]{16,32}$/.test(value)
    ? success(value)
    : invalid('Invalid repository ID')
}
export function commitId(value: unknown): Result<string> {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
    ? success(value)
    : invalid('Invalid commit ID')
}
export function idempotencyKey(value: unknown): Result<string> {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(value)
    ? success(value)
    : invalid('Invalid idempotency key')
}
export function filePath(value: unknown): Result<string> {
  if (typeof value !== 'string' || value.length === 0 || value.length > 240) {
    return invalid('Invalid file path')
  }
  // Relative, printable ASCII paths: reject traversal, Windows paths, aliases.
  if (
    !/^[\x21-\x7e]+$/.test(value) ||
    /[\\:%?#]/.test(value) ||
    value
      .split('/')
      .some((part) => part === '' || part === '.' || part === '..')
  ) {
    return invalid('Invalid file path')
  }
  return success(value)
}
export function repositoryName(value: unknown): Result<string> {
  return typeof value === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$/.test(value)
    ? success(value)
    : invalid('Invalid repository name')
}
