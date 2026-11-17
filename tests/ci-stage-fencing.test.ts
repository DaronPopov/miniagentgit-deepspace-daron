import { expect, it } from 'vitest'
import { ciFixture } from './ci-fixture'
import { unwrap } from './sqlite-fixture'
import { ciJobIdentity, ciPipeline } from '../src/application/ci/pipelines'
import { stageBounds } from '../src/application/ci/stages'
import { createCiStore } from '../src/server/storage/ci/store'
import { reserveDispatch } from '../src/server/storage/ci/dispatch'
import { runStage } from '../src/server/storage/ci/stages'
import { validateSnapshot } from '../src/application/ci/validation'

async function setup() {
  const f = await ciFixture()
  const store = createCiStore(f.db, f.id, f.limits, f.now, true)
  const pipeline = await ciPipeline(f.limits, true)
  const id = await ciJobIdentity(f.id, f.commit.id, pipeline)
  unwrap(store.admit(f.context, f.commit.id, pipeline, id))
  function dispatch() {
    const result = reserveDispatch(f.db, id, f.now())
    if (!result) throw new Error('Missing dispatch')
    return result
  }
  const read = () => unwrap(store.receipt(f.context, id))
  const cursor = () => f.db.all('SELECT * FROM ci_stages WHERE job_id=?', id)[0]
  return { ...f, store, id, dispatch, read, cursor }
}

it('rolls back failed stage persistence, resumes after a lost continuation, and fences older dispatch', async () => {
  const f = await setup()
  try {
    const first = f.dispatch()
    const run = (dispatch = first) => runStage(f.db, dispatch, f.now)
    f.db.run(
      "CREATE TRIGGER fail_checkpoint BEFORE UPDATE ON ci_stages BEGIN SELECT RAISE(ABORT,'injected'); END",
    )
    await expect(run()).rejects.toThrow('injected')
    expect(f.cursor()?.sequence).toBe(0)
    f.db.run('DROP TRIGGER fail_checkpoint')
    expect(await run()).toBe('continue')
    const checkpoint = f.cursor()
    expect(checkpoint?.sequence).toBe(1)
    expect(reserveDispatch(f.db, f.id, f.now())).toBeUndefined()
    f.advance(stageBounds.dispatchLeaseMs)
    const second = f.dispatch()
    expect(second.generation).toBe(2)
    expect(await run()).toBe('stale')
    expect(f.cursor()).toEqual(checkpoint)
    expect(reserveDispatch(f.db, f.id, f.now())).toBeUndefined()
    expect(await run(second)).toBe('done')
    const receipt = f.read()
    const job = unwrap(f.store.get(f.context, f.id))
    const legacy = await validateSnapshot(
      unwrap(f.store.snapshot(f.context, job)),
      f.limits,
      new AbortController().signal,
    )
    expect(receipt).toMatchObject(legacy)
    expect(await run(second)).toBe('stale')
    expect(f.read()).toEqual(receipt)
    expect(f.db.all('SELECT * FROM ci_receipts')).toHaveLength(1)
  } finally {
    await f.dispose()
  }
})

it.each([0, 1, 2])(
  'preserves cancellation at stage boundary %i',
  async (boundary) => {
    const f = await setup()
    try {
      const dispatch = f.dispatch()
      if (boundary >= 1)
        expect(await runStage(f.db, dispatch, f.now)).toBe('continue')
      if (boundary >= 2)
        expect(await runStage(f.db, dispatch, f.now)).toBe('done')
      unwrap(f.store.stop(f.context, f.id, 'cancelled'))
      const receipt = f.read()
      expect(receipt.terminalState).toBe(
        boundary === 2 ? 'passed' : 'cancelled',
      )
      const cursor = f.cursor()
      expect(await runStage(f.db, dispatch, f.now)).toBe('stale')
      expect(f.cursor()).toEqual(cursor)
      expect(f.read()).toEqual(receipt)
    } finally {
      await f.dispose()
    }
  },
)

it('expires delayed work after the overall deadline and bounds redispatch', async () => {
  const f = await setup()
  try {
    const first = f.dispatch()
    expect(await runStage(f.db, first, f.now)).toBe('continue')
    f.advance(stageBounds.dispatchLeaseMs)
    const last = f.dispatch()
    f.advance(stageBounds.dispatchLeaseMs)
    expect(reserveDispatch(f.db, f.id, f.now())).toBeUndefined()
    f.advance(stageBounds.elapsedMs)
    expect(await runStage(f.db, last, f.now)).toBe('stale')
    expect(f.read()).toMatchObject({
      terminalState: 'expired',
      code: 'deadline',
    })
  } finally {
    await f.dispose()
  }
})

it('fails closed for an unsupported admitted fingerprint', async () => {
  const f = await ciFixture()
  try {
    const store = createCiStore(f.db, f.id, f.limits, f.now, true)
    const pipeline = {
      ...(await ciPipeline(f.limits, true)),
      fingerprint: '0'.repeat(64),
    }
    const id = await ciJobIdentity(f.id, f.commit.id, pipeline)
    unwrap(store.admit(f.context, f.commit.id, pipeline, id))
    const dispatch = reserveDispatch(f.db, id, f.now())
    if (!dispatch) throw new Error('Missing dispatch')
    expect(await runStage(f.db, dispatch, f.now)).toBe('stale')
    expect(unwrap(store.receipt(f.context, id))).toMatchObject({
      terminalState: 'interrupted',
      code: 'pipeline_unavailable',
    })
  } finally {
    await f.dispose()
  }
})

it('fails corrupt integrity without advancing to source policy', async () => {
  const f = await setup()
  try {
    f.db.run('DROP TRIGGER immutable_snapshots_UPDATE')
    f.db.run('UPDATE snapshots SET manifest_hash=?', '0'.repeat(64))
    expect(await runStage(f.db, f.dispatch(), f.now)).toBe('done')
    expect(f.read()).toMatchObject({
      terminalState: 'failed',
      code: 'integrity_failed',
      checks: { manifest: 'failed', source: 'skipped', typescript: 'deferred' },
    })
  } finally {
    await f.dispose()
  }
})
