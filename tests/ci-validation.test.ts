import { expect, it } from 'vitest'
import { validateSnapshot } from '../src/application/ci/validation'
import { ciLimits } from '../src/application/ci/limits'
import { validSnapshot } from './ci-fixture'
import { sha256, canonicalManifest } from '../src/domain/commit-hashing'
import { sourcePolicy } from '../src/domain/ci/source-policy'
import { diagnosticCollector } from '../src/domain/ci/diagnostics'

const signal = () => new AbortController().signal
it('validates immutable hashes, canonical metadata and source policy without executing source', async () => {
  const text =
    'globalThis.__miniagent_ci_executed = true; throw new Error("must not execute");\n'
  const result = await validateSnapshot(
    await validSnapshot(text),
    ciLimits(),
    signal(),
  )
  expect(result.state).toBe('passed')
  expect(result.checks.typescript).toBe('deferred')
  expect(Object.hasOwn(globalThis, '__miniagent_ci_executed')).toBe(false)
})
it('fails closed on missing snapshot/content, wrong digests and declared byte counts', async () => {
  const original = await validSnapshot()
  const entry = original.entries[0]!
  for (const snapshot of [
    { ...original, manifestHash: null },
    { ...original, entries: [{ ...entry, content: null }] },
    { ...original, entries: [{ ...entry, hash: 'a'.repeat(64) }] },
    { ...original, entries: [{ ...entry, bytes: 1 }] },
    { ...original, commitId: 'b'.repeat(64) },
  ])
    expect((await validateSnapshot(snapshot, ciLimits(), signal())).code).toBe(
      'integrity_failed',
    )
})
it('rejects invalid/duplicate paths and noncanonical manifest ordering', async () => {
  const original = await validSnapshot()
  const entry = original.entries[0]!
  for (const entries of [
    [{ ...entry, path: '../escape' }],
    [entry, entry],
    [{ ...entry, path: 'z.ts' }, entry],
  ]) {
    expect(
      (await validateSnapshot({ ...original, entries }, ciLimits(), signal()))
        .state,
    ).toBe('failed')
  }
})
it('returns structured trailing whitespace, final newline, extension and physical-line diagnostics', async () => {
  for (const [text, path, code] of [
    ['hello \n', 'a.ts', 'trailing_whitespace'],
    ['hello', 'a.ts', 'missing_final_newline'],
    ['text\n', 'a.exe', 'unsupported_path'],
    ['x\n'.repeat(186), 'a.ts', 'line_limit'],
  ]) {
    const result = await validateSnapshot(
      await validSnapshot(text, path),
      ciLimits(),
      signal(),
    )
    expect(result.state).toBe('failed')
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.code === code),
    ).toBe(true)
  }
  expect(
    (await validateSnapshot(await validSnapshot('x\r\n'), ciLimits(), signal()))
      .state,
  ).toBe('passed')
  expect(
    (await validateSnapshot(await validSnapshot(''), ciLimits(), signal()))
      .state,
  ).toBe('passed')
})
it('rejects malformed text including NUL, bare CR and unpaired surrogate without echoing it', () => {
  for (const content of ['a\0b\n', 'a\rb\n', '\ud800\n']) {
    const diagnostics = diagnosticCollector(16, 2048)
    sourcePolicy(
      { path: 'a.ts', hash: '', bytes: 0, content },
      185,
      diagnostics,
    )
    expect(diagnostics.failed()).toBe(true)
    expect(JSON.stringify(diagnostics.snapshot())).not.toContain(content)
  }
})
it('bounds diagnostics and work/input even when many checks fail', async () => {
  const snapshot = await validSnapshot('bad \n'.repeat(20))
  const result = await validateSnapshot(
    snapshot,
    ciLimits({ diagnostics: 2, diagnosticBytes: 128 }),
    signal(),
  )
  expect(result.state).toBe('failed')
  expect(result.truncated).toBe(true)
  expect(result.diagnostics.length).toBeLessThanOrEqual(2)
  expect(
    new TextEncoder().encode(JSON.stringify(result.diagnostics)).length,
  ).toBeLessThanOrEqual(128)
  expect(
    (await validateSnapshot(snapshot, ciLimits({ workBytes: 1 }), signal()))
      .code,
  ).toBe('work_limit')
  expect(
    (await validateSnapshot(snapshot, ciLimits({ fileBytes: 1 }), signal()))
      .code,
  ).toBe('input_limit')
  expect(
    (await validateSnapshot(snapshot, ciLimits({ inputBytes: 1 }), signal()))
      .code,
  ).toBe('input_limit')
  expect(
    (
      await validateSnapshot(
        { ...snapshot, entries: [...snapshot.entries, ...snapshot.entries] },
        ciLimits({ files: 1 }),
        signal(),
      )
    ).code,
  ).toBe('input_limit')
})
it('hashes the full manifest, so reusing a different snapshot root does not pass', async () => {
  const snapshot = await validSnapshot()
  const wrong = await sha256(canonicalManifest([]))
  expect(
    (
      await validateSnapshot(
        { ...snapshot, manifestHash: wrong },
        ciLimits(),
        signal(),
      )
    ).state,
  ).toBe('failed')
})
