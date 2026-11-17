import { invalid, success } from '../domain/result'
import type { Result } from '../domain/result'

/** Application budgets, never representations of provider entitlements. */
export interface ResourceLimits {
  readonly requestBytes: number
  readonly fileBytes: number
  readonly changesPerCommit: number
  readonly commitTextBytes: number
  readonly messageBytes: number
  readonly filesPerRepository: number
  readonly commitsPerRepository: number
  readonly repositoryLogicalBytes: number
  readonly pageSize: number
}
export const FREE_TIER_LIMITS: Readonly<ResourceLimits> = Object.freeze({
  requestBytes: 256 * 1024,
  fileBytes: 32 * 1024,
  changesPerCommit: 16,
  commitTextBytes: 128 * 1024,
  messageBytes: 1024,
  filesPerRepository: 128,
  commitsPerRepository: 100,
  repositoryLogicalBytes: 8 * 1024 * 1024,
  pageSize: 25,
})

/** Lower-only configuration prevents accidental expansion of the demo budget. */
export function configureLimits(
  overrides: Partial<ResourceLimits> = {},
): Result<Readonly<ResourceLimits>> {
  const configured = { ...FREE_TIER_LIMITS }
  for (const key of Object.keys(overrides)) {
    if (!Object.hasOwn(FREE_TIER_LIMITS, key))
      return invalid('Unknown resource limit')
  }
  // Keys come from this exact closed object; no caller-controlled keys are cast.
  for (const key of Object.keys(FREE_TIER_LIMITS) as (keyof ResourceLimits)[]) {
    const value = overrides[key] ?? FREE_TIER_LIMITS[key]
    if (
      !Number.isSafeInteger(value) ||
      value <= 0 ||
      value > FREE_TIER_LIMITS[key]
    ) {
      return invalid(`Invalid resource limit: ${key}`)
    }
    configured[key] = value
  }
  return success(Object.freeze(configured))
}

export function withinQuota(
  resource: string,
  actual: number,
  maximum: number,
): Result<void> {
  if (
    !Number.isSafeInteger(actual) ||
    actual < 0 ||
    !Number.isSafeInteger(maximum) ||
    maximum < 0
  ) {
    return invalid('Invalid quota measurement')
  }
  return actual <= maximum
    ? success(undefined)
    : {
        ok: false,
        error: { code: 'QUOTA_EXCEEDED', resource, actual, maximum },
      }
}
export const utf8Bytes = (text: string): number =>
  new TextEncoder().encode(text).byteLength

/** Composition roots reject invalid or expanded budgets and capture a frozen copy. */
export function requireResourceLimits(
  overrides: Partial<ResourceLimits> = {},
): Readonly<ResourceLimits> {
  const result = configureLimits(overrides)
  if (!result.ok) throw new RangeError('Invalid application resource limits')
  return result.value
}
