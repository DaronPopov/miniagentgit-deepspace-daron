import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCommitScheduler } from '../src/application/commit-scheduler'
import type { ExecutionOutcome } from '../src/contracts/commit-scheduling'
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
describe('repository commit scheduling', () => {
  it('serializes simultaneous agents in admission order without losing descriptors', async () => {
    const gates = Array.from({ length: 3 }, () => deferred<ExecutionOutcome>())
    const started: string[] = []
    let active = 0,
      peak = 0
    const scheduler = createCommitScheduler({
      repositoryId: repo,
      capacity: 3,
      eventCapacity: 1,
      execute: async (request) => {
        const index = started.length
        started.push(request.requestId)
        active++
        peak = Math.max(peak, active)
        try {
          return await gates[index]!.promise
        } finally {
          active--
        }
      },
    })
    const jobs = await Promise.all(
      [0, 1, 2].map(async (i) => admitted(scheduler.submit(descriptor(i)))),
    )
    expect(started).toEqual([descriptor(0).requestId])
    expect(scheduler.submit(descriptor(3))).toMatchObject({
      kind: 'rejected',
      code: 'QUOTA_EXCEEDED',
    })
    for (let i = 0; i < 3; i++) {
      gates[i]!.resolve(committed)
      expect(await jobs[i]!.completion).toEqual(committed)
    }
    expect(started).toEqual([0, 1, 2].map((i) => descriptor(i).requestId))
    expect(peak).toBe(1)
    expect(scheduler.inspect()).toMatchObject({ pending: 0, active: false })
    expect(scheduler.events()).toHaveLength(1)
    expect(scheduler.events()[0]?.kind).toBe('committed')
  })
  it('lets another repository finish while the first is blocked', async () => {
    const gate = deferred<ExecutionOutcome>()
    const a = createCommitScheduler({
      repositoryId: repo,
      execute: () => gate.promise,
    })
    const other = 'repo_1234567890123456'
    const b = createCommitScheduler({
      repositoryId: other,
      execute: async () => committed,
    })
    const first = admitted(a.submit(descriptor(0)))
    const second = admitted(b.submit(descriptor(0, other)))
    expect(await second.completion).toEqual(committed)
    expect(a.inspect().active).toBe(true)
    gate.resolve(committed)
    await first.completion
  })
  it('releases ownership on sync exceptions, async rejection and conflict, then continues', async () => {
    let count = 0
    const scheduler = createCommitScheduler({
      repositoryId: repo,
      execute: () => {
        if (count++ === 0)
          throw new Error('secret exception must not enter telemetry')
        if (count === 2) return Promise.reject(new Error('failure'))
        if (count === 3)
          return Promise.resolve({ kind: 'conflict', actualHead: null })
        return Promise.resolve(committed)
      },
    })
    const jobs = [0, 1, 2, 3].map((i) =>
      admitted(scheduler.submit(descriptor(i))),
    )
    expect(
      (await Promise.all(jobs.map((job) => job.completion))).map(
        (outcome) => outcome.kind,
      ),
    ).toEqual(['failed', 'failed', 'conflict', 'committed'])
    expect(scheduler.inspect().pending).toBe(0)
    expect(JSON.stringify(scheduler.events())).not.toContain('secret')
  })
  it('rejects wrong owners and pending duplicates and copies lightweight descriptors', async () => {
    const captured: unknown[] = []
    const scheduler = createCommitScheduler({
      repositoryId: repo,
      execute: async (request) => {
        captured.push(request)
        return committed
      },
    })
    const request = {
      ...descriptor(0),
      source: 'never retain',
      token: 'secret',
    }
    const job = admitted(scheduler.submit(request))
    expect(scheduler.submit(request)).toMatchObject({ reason: 'duplicate' })
    expect(
      scheduler.submit(descriptor(1, 'repo_1234567890123456')),
    ).toMatchObject({ reason: 'invalid' })
    request.preparedRef = 'c'.repeat(64)
    await job.completion
    expect(captured[0]).toEqual(descriptor(0))
    expect(scheduler.events().every((event) => Object.isFrozen(event))).toBe(
      true,
    )
  })
  it('rejects invalid config and can shut down before the drain microtask', async () => {
    expect(() =>
      createCommitScheduler({
        repositoryId: repo,
        capacity: 33,
        execute: async () => committed,
      }),
    ).toThrow()
    const execute = vi.fn(async () => committed)
    const scheduler = createCommitScheduler({ repositoryId: repo, execute })
    const job = admitted(scheduler.submit(descriptor(0)))
    expect(scheduler.shutdown()).toEqual({ quiescent: true })
    expect(await job.completion).toEqual({
      kind: 'cancelled',
      execution: 'not-started',
    })
    await checkpoint()
    expect(execute).not.toHaveBeenCalled()
  })
})
