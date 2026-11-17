import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createCommitScheduler } from '../src/application/commit-scheduler'
import type {
  CommitDescriptor,
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
it('cancels queued requests, immediately freeing capacity without disturbing FIFO', async () => {
  const gate = deferred<ExecutionOutcome>()
  const execute = vi.fn<
    (request: CommitDescriptor) => Promise<ExecutionOutcome>
  >(() => gate.promise)
  const scheduler = createCommitScheduler({
    repositoryId: repo,
    capacity: 2,
    execute,
  })
  const first = admitted(scheduler.submit(descriptor(0)))
  const second = admitted(scheduler.submit(descriptor(1)))
  await checkpoint()
  expect(second.cancel()).toBe(true)
  expect(second.cancel()).toBe(false)
  expect(await second.completion).toEqual({
    kind: 'cancelled',
    execution: 'not-started',
  })
  const third = admitted(scheduler.submit(descriptor(2)))
  gate.resolve(committed)
  await first.completion
  await third.completion
  expect(execute.mock.calls.map(([request]) => request?.requestId)).toEqual([
    descriptor(0).requestId,
    descriptor(2).requestId,
  ])
})
it('signals async cancellation but never overlaps an executor before it settles', async () => {
  const gate = deferred<ExecutionOutcome>()
  let signal: AbortSignal | undefined
  let count = 0
  const scheduler = createCommitScheduler({
    repositoryId: repo,
    execute: async (_, cancellation) => {
      signal = cancellation
      if (count++ === 0) return gate.promise
      return committed
    },
  })
  const first = admitted(scheduler.submit(descriptor(0)))
  const second = admitted(scheduler.submit(descriptor(1)))
  await checkpoint()
  first.cancel()
  expect(signal?.aborted).toBe(true)
  expect(await first.completion).toEqual({
    kind: 'cancelled',
    execution: 'unknown',
  })
  expect(count).toBe(1)
  gate.resolve(committed)
  expect(await second.completion).toEqual(committed)
  expect(scheduler.inspect().pending).toBe(0)
})
it('expires active work, closes admission, settles queued callers, and retains uncertain ownership', async () => {
  const gate = deferred<ExecutionOutcome>()
  const scheduler = createCommitScheduler({
    repositoryId: repo,
    deadlineMs: 10,
    execute: () => gate.promise,
  })
  const first = admitted(scheduler.submit(descriptor(0)))
  const second = admitted(scheduler.submit(descriptor(1)))
  await checkpoint()
  vi.advanceTimersByTime(10)
  expect(await first.completion).toMatchObject({
    kind: 'failed',
    reason: 'deadline',
    execution: 'unknown',
  })
  expect(await second.completion).toMatchObject({
    kind: 'cancelled',
    execution: 'not-started',
  })
  expect(scheduler.inspect()).toMatchObject({
    closed: true,
    active: true,
    pending: 1,
  })
  expect(scheduler.submit(descriptor(2))).toMatchObject({ reason: 'closed' })
  gate.reject(new Error('late failure'))
  await checkpoint()
  expect(scheduler.inspect()).toMatchObject({ active: false, pending: 0 })
})
it('keeps the original deadline after active cancellation if abort is ignored', async () => {
  const gate = deferred<ExecutionOutcome>()
  const scheduler = createCommitScheduler({
    repositoryId: repo,
    deadlineMs: 10,
    execute: () => gate.promise,
  })
  const first = admitted(scheduler.submit(descriptor(0)))
  await checkpoint()
  first.cancel()
  await first.completion
  vi.advanceTimersByTime(10)
  expect(scheduler.inspect().closed).toBe(true)
  gate.resolve(committed)
  await checkpoint()
  expect(scheduler.inspect().pending).toBe(0)
})
it('settles every admitted caller during controlled shutdown, reports actual quiescence', async () => {
  const gate = deferred<ExecutionOutcome>()
  const scheduler = createCommitScheduler({
    repositoryId: repo,
    execute: () => gate.promise,
  })
  const jobs = [0, 1, 2].map((i) => admitted(scheduler.submit(descriptor(i))))
  await checkpoint()
  expect(scheduler.shutdown()).toEqual({ quiescent: false })
  const outcomes = await Promise.all(jobs.map((job) => job.completion))
  expect(outcomes.map((outcome) => outcome.kind)).toEqual([
    'cancelled',
    'cancelled',
    'cancelled',
  ])
  gate.resolve(committed)
  await checkpoint()
  expect(scheduler.shutdown()).toEqual({ quiescent: true })
  expect(scheduler.inspect().pending).toBe(0)
})
