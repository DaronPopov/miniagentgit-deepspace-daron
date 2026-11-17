import type { CiCode, CiSnapshot, CiValidation } from '../../contracts/ci'
import {
  canonicalManifest,
  comparePaths,
  sha256,
} from '../../domain/commit-hashing'
import { commitId, filePath } from '../../domain/validation'
import { diagnosticCollector } from '../../domain/ci/diagnostics'
import { sourcePolicy } from '../../domain/ci/source-policy'
import type { CiLimits } from './limits'

export function failedValidation(code: CiCode): CiValidation {
  return {
    state: 'failed',
    code,
    checks: { manifest: 'failed', source: 'skipped', typescript: 'deferred' },
    diagnostics: [],
    truncated: false,
    files: 0,
    bytes: 0,
    work: 0,
  }
}
/** Only fixed server code runs. No import/eval/config/module resolution of input. */
export async function validateIntegrity(
  snapshot: CiSnapshot,
  limits: CiLimits,
  signal: AbortSignal,
  workMaximum = limits.workBytes,
): Promise<CiValidation> {
  const diagnostics = diagnosticCollector(
    limits.diagnostics,
    limits.diagnosticBytes,
  )
  let bytes = 0,
    work = 0,
    files = 0
  const charge = (amount: number) => {
    work += amount
    return work <= workMaximum
  }
  const fail = (code: CiCode): CiValidation => ({
    ...failedValidation(code),
    diagnostics: diagnostics.snapshot(),
    truncated: diagnostics.truncated(),
    files,
    bytes,
    work: Math.min(work, workMaximum),
  })
  if (snapshot.entries.length > limits.files) return fail('input_limit')
  if (
    !snapshot.manifestHash ||
    !commitId(snapshot.manifestHash).ok ||
    !commitId(snapshot.commitId).ok
  )
    diagnostics.add('manifest', 'missing_snapshot')
  const manifest = []
  let previous: string | undefined
  for (const entry of snapshot.entries) {
    if (signal.aborted) return fail('cancelled')
    if (
      !filePath(entry.path).ok ||
      (previous !== undefined && comparePaths(previous, entry.path) >= 0)
    )
      diagnostics.add('manifest', 'invalid_order_or_path')
    if (diagnostics.failed()) return fail('integrity_failed')
    previous = entry.path
    if (
      !commitId(entry.hash).ok ||
      !Number.isSafeInteger(entry.bytes) ||
      entry.bytes < 0
    )
      diagnostics.add('manifest', 'invalid_entry', entry.path)
    if (diagnostics.failed()) return fail('integrity_failed')
    if (entry.content === null) {
      diagnostics.add('manifest', 'missing_content', entry.path)
      continue
    }
    if (entry.content.length > limits.fileBytes) return fail('input_limit')
    const actual = new TextEncoder().encode(entry.content).length
    bytes += actual
    files++
    if (
      actual > limits.fileBytes ||
      bytes > limits.inputBytes ||
      entry.bytes > limits.fileBytes
    )
      return fail('input_limit')
    if (!charge(actual * 2)) return fail('work_limit') // Read/decode + content hash work.
    if (actual !== entry.bytes)
      diagnostics.add('manifest', 'byte_count', entry.path)
    if ((await sha256(entry.content)) !== entry.hash)
      diagnostics.add('manifest', 'content_digest', entry.path)
    manifest.push({
      path: entry.path,
      contentHash: entry.hash,
      utf8Bytes: entry.bytes,
    })
  }
  if (snapshot.canonicalCommit.length > 4096) return fail('input_limit')
  const canonical = canonicalManifest(manifest)
  if (
    !charge(
      new TextEncoder().encode(canonical + snapshot.canonicalCommit).length,
    )
  )
    return fail('work_limit')
  if ((await sha256(canonical)) !== snapshot.manifestHash)
    diagnostics.add('manifest', 'manifest_digest')
  if ((await sha256(snapshot.canonicalCommit)) !== snapshot.commitId)
    diagnostics.add('manifest', 'commit_digest')
  if (diagnostics.failed()) return fail('integrity_failed')
  return {
    state: 'passed',
    code: 'none',
    checks: { manifest: 'passed', source: 'skipped', typescript: 'deferred' },
    diagnostics: [],
    truncated: false,
    files,
    bytes,
    work,
  }
}

export function validateSource(
  snapshot: CiSnapshot,
  limits: CiLimits,
  signal: AbortSignal,
  integrity: CiValidation,
  workMaximum = limits.workBytes,
): CiValidation {
  const diagnostics = diagnosticCollector(
    limits.diagnostics,
    limits.diagnosticBytes,
  )
  let work = integrity.work
  const fail = (code: CiCode): CiValidation => ({
    ...integrity,
    ...failedValidation(code),
    files: integrity.files,
    bytes: integrity.bytes,
    diagnostics: diagnostics.snapshot(),
    truncated: diagnostics.truncated(),
    work: Math.min(work, workMaximum),
  })
  for (const entry of snapshot.entries) {
    if (signal.aborted) return fail('cancelled')
    work += new TextEncoder().encode(entry.content ?? '').length
    if (work > workMaximum) return fail('work_limit')
    sourcePolicy(entry, limits.lines, diagnostics)
  }
  if (signal.aborted) return fail('cancelled')
  return {
    state: diagnostics.failed() ? 'failed' : 'passed',
    code: diagnostics.failed() ? 'checks_failed' : 'none',
    checks: {
      manifest: 'passed',
      source: diagnostics.failed() ? 'failed' : 'passed',
      typescript: 'deferred',
    },
    diagnostics: diagnostics.snapshot(),
    truncated: diagnostics.truncated(),
    files: integrity.files,
    bytes: integrity.bytes,
    work,
  }
}

export async function validateSnapshot(
  snapshot: CiSnapshot,
  limits: CiLimits,
  signal: AbortSignal,
  workMaximum = limits.workBytes,
): Promise<CiValidation> {
  const integrity = await validateIntegrity(
    snapshot,
    limits,
    signal,
    workMaximum,
  )
  return integrity.state === 'passed'
    ? validateSource(snapshot, limits, signal, integrity, workMaximum)
    : integrity
}
