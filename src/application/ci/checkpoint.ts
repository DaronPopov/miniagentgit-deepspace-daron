import type { CiJob, CiValidation } from '../../contracts/ci'
import { objectValue } from '../../domain/validation'
import type { CiLimits } from './limits'
import { ciStages, stageBounds } from './stages'

export function encodeCheckpoint(
  job: CiJob,
  ordinal: number,
  result: CiValidation,
) {
  return JSON.stringify({
    schema: 1,
    stage: ciStages[ordinal - 1],
    fingerprint: job.pipeline.fingerprint,
    generation: job.generation,
    result,
  })
}

function bounded(value: unknown, maximum: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= maximum
  )
}

export function readCheckpoint(
  raw: string,
  job: CiJob,
  ordinal: number,
  limits: CiLimits,
): CiValidation | undefined {
  if (
    raw.length > stageBounds.checkpointBytes ||
    new TextEncoder().encode(raw).length > stageBounds.checkpointBytes ||
    !Number.isInteger(ordinal) ||
    ordinal < 1 ||
    ordinal >= ciStages.length
  )
    return
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return
  }
  if (
    !objectValue(value) ||
    Object.keys(value).length !== 5 ||
    value.schema !== 1 ||
    value.stage !== ciStages[ordinal - 1] ||
    value.fingerprint !== job.pipeline.fingerprint ||
    value.generation !== job.generation ||
    !objectValue(value.result) ||
    Object.keys(value.result).length !== 8
  )
    return
  const { state, code, checks, diagnostics, truncated, files, bytes, work } =
    value.result
  const required: CiValidation['checks'] = {
    manifest: 'passed',
    source: ordinal >= 2 ? 'passed' : 'skipped',
    typescript: 'deferred',
    ...(ordinal >= 3 ? { syntax: 'passed' } : {}),
    ...(ordinal >= 4 ? { lint: 'passed' } : {}),
  } as const
  if (
    state !== 'passed' ||
    code !== 'none' ||
    truncated !== false ||
    !Array.isArray(diagnostics) ||
    diagnostics.length !== 0 ||
    !bounded(files, limits.files) ||
    !bounded(bytes, limits.inputBytes) ||
    !bounded(work, limits.workBytes) ||
    bytes > files * limits.fileBytes ||
    work < bytes * (ordinal >= 2 ? 3 : 2) ||
    !objectValue(checks) ||
    Object.keys(checks).length !== Object.keys(required).length ||
    Object.entries(required).some(([key, expected]) => checks[key] !== expected)
  )
    return
  return {
    state,
    code,
    checks: required,
    diagnostics: [],
    truncated,
    files,
    bytes,
    work,
  }
}
