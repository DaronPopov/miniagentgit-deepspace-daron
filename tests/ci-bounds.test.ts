import { expect, it } from 'vitest'
import { ciFixture } from './ci-fixture'
import { request, unwrap } from './sqlite-fixture'
import { ciLimits } from '../src/application/ci/limits'
import { ciPipeline } from '../src/application/ci/pipelines'
import {
  verifyCiFingerprint,
  expectedCiFingerprint,
} from '../scripts/ci-fingerprint.mjs'

it('verifies implementation fingerprints and changes identity when policy changes', async () => {
  expect(() => verifyCiFingerprint()).not.toThrow()
  expect(expectedCiFingerprint().sourceFingerprint).toMatch(/^[a-f0-9]{64}$/)
  expect((await ciPipeline(ciLimits())).fingerprint).not.toBe(
    (await ciPipeline(ciLimits({ lines: 184 }))).fingerprint,
  )
  for (const overrides of [
    { files: 0 },
    { storedJobs: 33 },
    { deadlineMs: Infinity },
    { receiptBytes: 10 },
  ])
    expect(() => ciLimits(overrides)).toThrow()
})
it('serializes execution claims in durable FIFO order', async () => {
  const f = await ciFixture()
  try {
    const second = unwrap(
      await f.authority.createCommit(
        f.context,
        request('ci_second_commit_key', f.commit.id, 'second\n'),
      ),
    )
    const a = unwrap(await f.admit()),
      b = unwrap(await f.admit(second.id))
    const first = unwrap(f.store.claim(f.context, f.pipeline))!
    expect(first.id).toBe(a.id)
    expect(unwrap(f.store.claim(f.context, f.pipeline))).toBeNull()
    unwrap(f.store.stop(f.context, a.id, 'cancelled'))
    expect(unwrap(f.store.claim(f.context, f.pipeline))?.id).toBe(b.id)
  } finally {
    await f.dispose()
  }
})
it('coalesces simultaneous duplicate admissions and advances only bounded work per observation', async () => {
  const f = await ciFixture()
  try {
    const second = unwrap(
      await f.authority.createCommit(
        f.context,
        request('ci_bounded_drain_key', f.commit.id, 'second\n'),
      ),
    )
    const a = unwrap(await f.admit()),
      b = unwrap(await f.admit(second.id))
    f.engine.status(f.context, a.id)
    await f.engine.whenIdle()
    expect(unwrap(f.store.get(f.context, a.id)).state).toBe('passed')
    expect(unwrap(f.store.get(f.context, b.id)).state).toBe('queued')
    const responses = await Promise.all(
      Array.from({ length: 6 }, () => f.engine.request(f.context, f.commit.id)),
    )
    expect(
      responses.every((result) => result.ok && result.value.id === a.id),
    ).toBe(true)
    await f.engine.whenIdle()
    expect(f.db.all('SELECT id FROM ci_jobs')).toHaveLength(2)
    f.engine.status(f.context, b.id)
    await f.engine.whenIdle()
    expect(unwrap(f.store.get(f.context, b.id)).state).toBe('passed')
  } finally {
    await f.dispose()
  }
})
