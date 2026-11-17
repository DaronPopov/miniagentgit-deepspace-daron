export const CI_DEFAULT_LIMITS = Object.freeze({
  outstanding: 4,
  storedJobs: 32,
  storedBytes: 512 * 1024,
  files: 32,
  fileBytes: 32 * 1024,
  inputBytes: 128 * 1024,
  diagnostics: 16,
  diagnosticBytes: 2048,
  receiptBytes: 8192,
  attempts: 2,
  jobsPerDrain: 1,
  workBytes: 512 * 1024,
  deadlineMs: 2000,
  lines: 185,
  pageSize: 8,
})
export type CiLimits = Readonly<Record<keyof typeof CI_DEFAULT_LIMITS, number>>
export function ciLimits(overrides: Partial<CiLimits> = {}): CiLimits {
  const result: Record<keyof CiLimits, number> = { ...CI_DEFAULT_LIMITS }
  for (const key of Object.keys(overrides))
    if (!Object.hasOwn(result, key)) throw new RangeError('Unknown CI limit')
  // Keys originate in the fixed server definition, not request input.
  for (const key of Object.keys(result) as (keyof CiLimits)[]) {
    const value = overrides[key] ?? result[key]
    if (!Number.isSafeInteger(value) || value < 1 || value > result[key])
      throw new RangeError(`Invalid CI limit: ${key}`)
    result[key] = value
  }
  if (
    result.receiptBytes < 1024 ||
    result.diagnosticBytes + 1024 > result.receiptBytes
  )
    throw new RangeError('Inconsistent CI output limits')
  return Object.freeze(result)
}
