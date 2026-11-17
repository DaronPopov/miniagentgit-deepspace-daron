import { expect, it } from 'vitest'
import { createRepositoryRuntime } from '../src/application/repository-runtime'
import { fixture, request, unwrap } from './sqlite-fixture'
import { deferred } from './scheduler-fixture'

it('bounds prepared payload ownership, rejects full intake, and frees queued cancellation before execution', async () => {
  const f = await fixture()
  const gate = deferred<void>()
  const controller = new AbortController()
  const active = deferred<void>()
  const runtime = createRepositoryRuntime({
    id: f.id,
    scheduler: { capacity: 2 },
    authority: {
      ...f.authority,
      executeCommit: async (...args) => {
        active.resolve()
        await gate.promise
        return f.authority.executeCommit(...args)
      },
    },
  })
  try {
    unwrap(await f.initialize())
    const first = runtime.service.createCommit(f.context, request())
    await active.promise
    const second = runtime.service.createCommit(
      f.context,
      request('queued_cancel_key'),
      controller.signal,
    )
    expect(runtime.retainedPayloads()).toBe(2)
    expect(
      await runtime.service.createCommit(
        f.context,
        request('full_capacity_key'),
      ),
    ).toMatchObject({ error: { code: 'QUOTA_EXCEEDED' } })
    controller.abort()
    expect(await second).toMatchObject({ error: { code: 'UNAVAILABLE' } })
    expect(runtime.retainedPayloads()).toBe(1)
    gate.resolve()
    unwrap(await first)
    expect(runtime.retainedPayloads()).toBe(0)
    expect(f.db.all('SELECT * FROM commits')).toHaveLength(1)
  } finally {
    gate.resolve()
    f.close()
  }
})

it('does not retire an in-flight authority when its lifetime-extension callback throws', async () => {
  const f = await fixture()
  const entered = deferred<void>()
  const gate = deferred<void>()
  const runtime = createRepositoryRuntime({
    id: f.id,
    scheduler: { capacity: 1 },
    retainExecution: () => {
      throw new Error('tracking failure')
    },
    authority: {
      ...f.authority,
      executeCommit: async (...args) => {
        entered.resolve()
        await gate.promise
        return f.authority.executeCommit(...args)
      },
    },
  })
  try {
    unwrap(await f.initialize())
    const pending = runtime.service.createCommit(f.context, request())
    await entered.promise
    expect(runtime.scheduler.inspect()).toMatchObject({
      active: true,
      pending: 1,
    })
    expect(
      await runtime.service.createCommit(
        f.context,
        request('second_request_key'),
      ),
    ).toMatchObject({ error: { code: 'QUOTA_EXCEEDED' } })
    gate.resolve()
    expect(await pending).toMatchObject({ error: { code: 'UNAVAILABLE' } })
    unwrap(await f.authority.replay(f.context, 'commit_request_key_1'))
    expect(runtime.retainedPayloads()).toBe(0)
    expect(runtime.scheduler.inspect().active).toBe(false)
  } finally {
    gate.resolve()
    f.close()
  }
})
