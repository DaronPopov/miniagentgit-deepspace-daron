import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createCommitScheduler } from '../src/application/commit-scheduler'
import type {
  SchedulerClock,
  ExecutionOutcome,
} from '../src/contracts/commit-scheduling'
import {
  admitted,
  checkpoint,
  committed,
  deferred,
  descriptor,
  repo,
} from './scheduler-fixture'

beforeEach(() =>
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] }),
)
afterEach(() => {
  expect(vi.getTimerCount()).toBe(0)
  vi.useRealTimers()
})
it('refuses to execute queued work after its deadline even before a timer callback', async () => {
  let now = 0
  const clock: SchedulerClock = { now: () => now, arm: () => () => {} }
  const execute = vi.fn(async () => committed)
  const scheduler = createCommitScheduler({
    repositoryId: repo,
    deadlineMs: 10,
    clock,
    execute,
  })
  const job = admitted(scheduler.submit(descriptor(0)))
  now = 11
  expect(await job.completion).toMatchObject({
    kind: 'failed',
    reason: 'deadline',
    execution: 'not-started',
  })
  expect(execute).not.toHaveBeenCalled()
  expect(scheduler.inspect().pending).toBe(0)
})
it('treats completion after a missed deadline as unknown, not as timely success', async () => {
  let now = 0
  const clock: SchedulerClock = { now: () => now, arm: () => () => {} }
  const gate = deferred<ExecutionOutcome>()
  const scheduler = createCommitScheduler({
    repositoryId: repo,
    deadlineMs: 10,
    clock,
    execute: () => gate.promise,
  })
  const job = admitted(scheduler.submit(descriptor(0)))
  await checkpoint()
  now = 11
  gate.resolve(committed)
  expect(await job.completion).toMatchObject({
    kind: 'failed',
    reason: 'deadline',
    execution: 'unknown',
  })
  expect(scheduler.inspect()).toMatchObject({ closed: true, pending: 0 })
})
it('handles cooperative async abort and continues only after acknowledgement', async () => {
  const scheduler = createCommitScheduler({
    repositoryId: repo,
    execute: (request, signal) => {
      if (request.requestId === descriptor(0).requestId)
        return new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')), {
            once: true,
          })
        })
      return Promise.resolve(committed)
    },
  })
  const first = admitted(scheduler.submit(descriptor(0)))
  const second = admitted(scheduler.submit(descriptor(1)))
  await checkpoint()
  first.cancel()
  await first.completion
  expect(await second.completion).toEqual(committed)
  expect(scheduler.inspect().pending).toBe(0)
})
it('bounds state through repeated failed/cancelled/refilled requests and telemetry eviction', async () => {
  const scheduler = createCommitScheduler({
    repositoryId: repo,
    capacity: 1,
    eventCapacity: 3,
    execute: async () => committed,
  })
  for (let i = 0; i < 200; i++) {
    const job = admitted(scheduler.submit(descriptor(i)))
    if (i % 2 === 0) job.cancel()
    await job.completion
    expect(scheduler.inspect().pending).toBe(0)
    expect(scheduler.events().length).toBeLessThanOrEqual(3)
  }
  expect(scheduler.events().at(-1)?.sequence).toBeGreaterThan(200)
})
