import { expect, it } from 'vitest'
import { ciFixture } from './ci-fixture'
import { unwrap } from './sqlite-fixture'
import { validateSnapshot } from '../src/application/ci/validation'
import type { CiValidation } from '../src/contracts/ci'

function controlled() {
  let release!: () => void
  let started!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const running = new Promise<void>((resolve) => {
    started = resolve
  })
  let signal: AbortSignal | undefined
  return {
    release,
    running,
    signal: () => signal,
    validate: async (...args: Parameters<typeof validateSnapshot>) => {
      signal = args[2]
      started()
      await gate
      return validateSnapshot(args[0], args[1], new AbortController().signal)
    },
  }
}
it('persists acceptance without waiting and cooperatively cancels active validation', async () => {
  const control = controlled(),
    f = await ciFixture({}, { validate: control.validate })
  try {
    const job = unwrap(await f.engine.request(f.context, f.commit.id))
    expect(job.state).toBe('queued')
    await control.running
    expect(unwrap(f.store.get(f.context, job.id)).state).toBe('running')
    expect(unwrap(f.engine.cancel(f.context, job.id)).state).toBe('cancelled')
    expect(control.signal()?.aborted).toBe(true)
    control.release()
    await f.engine.whenIdle()
    expect(unwrap(f.engine.receipt(f.context, job.id)).terminalState).toBe(
      'cancelled',
    )
    expect(f.engine.inspect().active).toBe(false)
  } finally {
    control.release()
    await f.dispose()
  }
})
it('expires active work and fences a validator that ignores cancellation', async () => {
  const control = controlled(),
    f = await ciFixture({}, { validate: control.validate })
  try {
    const job = unwrap(await f.engine.request(f.context, f.commit.id))
    await control.running
    f.advance(f.limits.deadlineMs)
    f.fireTimers()
    expect(control.signal()?.aborted).toBe(true)
    control.release()
    await f.engine.whenIdle()
    expect(unwrap(f.store.receipt(f.context, job.id))).toMatchObject({
      terminalState: 'expired',
      code: 'deadline',
    })
  } finally {
    control.release()
    await f.dispose()
  }
})
it('cancels queued work before any execution claim', async () => {
  const f = await ciFixture()
  try {
    const job = unwrap(await f.admit())
    expect(unwrap(f.engine.cancel(f.context, job.id))).toMatchObject({
      state: 'cancelled',
      attempts: 0,
    })
    expect(unwrap(f.store.claim(f.context, f.pipeline))).toBeNull()
  } finally {
    await f.dispose()
  }
})
it('turns validator exceptions into persistent failures and releases execution ownership', async () => {
  const f = await ciFixture(
    {},
    {
      validate: async () => {
        throw new Error('private validator details')
      },
    },
  )
  try {
    const job = unwrap(await f.engine.request(f.context, f.commit.id))
    await f.engine.whenIdle()
    const receipt = unwrap(f.store.receipt(f.context, job.id))
    expect(receipt.code).toBe('validator_exception')
    expect(JSON.stringify(receipt)).not.toContain('private')
    expect(f.engine.inspect().active).toBe(false)
  } finally {
    await f.dispose()
  }
})
it('fails closed for oversized validator output', async () => {
  const f = await ciFixture(
    {},
    {
      validate: async () =>
        ({
          state: 'failed',
          code: 'checks_failed',
          checks: {
            manifest: 'passed',
            source: 'failed',
            typescript: 'deferred',
          },
          diagnostics: Array.from({ length: 17 }, () => ({
            check: 'source',
            code: 'trailing_whitespace',
          })),
          truncated: false,
          files: 1,
          bytes: 6,
          work: 12,
        }) satisfies CiValidation,
    },
  )
  try {
    const job = unwrap(await f.engine.request(f.context, f.commit.id))
    await f.engine.whenIdle()
    expect(unwrap(f.store.receipt(f.context, job.id))).toMatchObject({
      state: 'failed',
      code: 'output_limit',
      diagnostics: [],
    })
  } finally {
    await f.dispose()
  }
})
