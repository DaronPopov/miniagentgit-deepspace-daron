import { expect, it } from 'vitest'
import { ciFixture } from './ci-fixture'
import { unwrap } from './sqlite-fixture'
import { validateSnapshot } from '../src/application/ci/validation'

it('recovers a persisted running job and fences its old execution generation', async () => {
  const f = await ciFixture()
  try {
    const admitted = unwrap(await f.admit())
    const old = unwrap(f.store.claim(f.context, f.pipeline))!
    unwrap(f.store.recover(f.context))
    const current = unwrap(f.store.claim(f.context, f.pipeline))!
    expect(current.generation).toBeGreaterThan(old.generation)
    const result = await validateSnapshot(
      unwrap(f.store.snapshot(f.context, current)),
      f.limits,
      new AbortController().signal,
    )
    expect(unwrap(f.store.finish(f.context, current, result)).state).toBe(
      'passed',
    )
    expect(f.store.finish(f.context, old, result)).toMatchObject({
      ok: false,
      error: { code: 'CONFLICT' },
    })
    expect(unwrap(f.store.receipt(f.context, admitted.id)).generation).toBe(
      current.generation,
    )
  } finally {
    await f.dispose()
  }
})
it('bounds attempts and returns interrupted instead of passing after repeated termination', async () => {
  const f = await ciFixture()
  try {
    const job = unwrap(await f.admit())
    unwrap(f.store.claim(f.context, f.pipeline))
    unwrap(f.store.recover(f.context))
    unwrap(f.store.claim(f.context, f.pipeline))
    unwrap(f.store.recover(f.context))
    expect(unwrap(f.store.get(f.context, job.id))).toMatchObject({
      state: 'interrupted',
      attempts: 2,
    })
    expect(unwrap(f.store.receipt(f.context, job.id)).code).toBe(
      'attempts_exhausted',
    )
  } finally {
    await f.dispose()
  }
})
it('preserves queued identities across engine recreation and rejects unavailable versions', async () => {
  const f = await ciFixture()
  try {
    const job = unwrap(await f.admit())
    const engine = f.newEngine()
    expect(engine.status(f.context, job.id).ok).toBe(true)
    await engine.whenIdle()
    expect(unwrap(f.store.get(f.context, job.id)).state).toBe('passed')
    const other = unwrap(
      await f.admit(f.commit.id, { ...f.pipeline, version: 2 }),
    )
    expect(other.id).not.toBe(job.id)
    unwrap(f.store.claim(f.context, f.pipeline))
    expect(unwrap(f.store.receipt(f.context, other.id)).code).toBe(
      'pipeline_unavailable',
    )
  } finally {
    await f.dispose()
  }
})
it('atomically rolls back terminal state when receipt persistence fails', async () => {
  const f = await ciFixture()
  try {
    unwrap(await f.admit())
    const job = unwrap(f.store.claim(f.context, f.pipeline))!
    const result = await validateSnapshot(
      unwrap(f.store.snapshot(f.context, job)),
      f.limits,
      new AbortController().signal,
    )
    f.db.run(
      "CREATE TRIGGER inject_ci_failure BEFORE INSERT ON ci_receipts BEGIN SELECT RAISE(ABORT,'injected'); END",
    )
    expect(() => f.store.finish(f.context, job, result)).toThrow('injected')
    expect(unwrap(f.store.get(f.context, job.id)).state).toBe('running')
    expect(f.db.all('SELECT * FROM ci_receipts')).toHaveLength(0)
  } finally {
    await f.dispose()
  }
})
