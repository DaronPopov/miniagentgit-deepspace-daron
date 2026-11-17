import { createBoundedRing } from '../domain/bounded-ring'
import { createEventRing } from '../domain/event-ring'
import type { CommitEventDetail } from '../contracts/commit-events'
import type {
  Admission,
  CommitDescriptor,
  CommitScheduler,
  ScheduledOutcome,
  SchedulerOptions,
} from '../contracts/commit-scheduling'
import {
  copyDescriptor,
  rejectAdmission,
  schedulerConfiguration,
  systemSchedulerClock,
  copyExecution,
} from './scheduler-policy'

import { createOwnedRequest } from './scheduled-request'
import type { OwnedRequest } from './scheduled-request'

/** One factory call per repository runtime. Never instantiate per HTTP request. */
export function createCommitScheduler(
  options: SchedulerOptions,
): CommitScheduler {
  const config = schedulerConfiguration(options)
  const clock = options.clock ?? systemSchedulerClock
  const execute = options.execute
  const queue = createBoundedRing<OwnedRequest>(config.capacity)
  const events = createEventRing(config.eventCapacity)
  const owned = new Map<string, OwnedRequest>()
  let active: OwnedRequest | undefined
  let closed = false
  let drainScheduled = false
  function event(job: OwnedRequest, detail: CommitEventDetail) {
    events.append({
      ...detail,
      repositoryId: config.repositoryId,
      requestId: job.request.requestId,
    })
  }
  function settle(job: OwnedRequest, outcome: ScheduledOutcome) {
    if (job.settled) return
    job.settled = true
    if (job !== active || outcome.kind !== 'cancelled') job.stopTimer()
    job.resolve(Object.freeze(outcome))
    if (job !== active) owned.delete(job.request.requestId)
  }
  function cancel(job: OwnedRequest): boolean {
    if (job.settled) return false
    const running = job === active
    if (!running) queue.remove(job)
    event(job, { kind: 'cancelled', phase: running ? 'active' : 'queued' })
    settle(job, {
      kind: 'cancelled',
      execution: running ? 'unknown' : 'not-started',
    })
    job.controller.abort()
    return true
  }
  function shutdown() {
    closed = true
    // Snapshot is bounded; cancellation removes each queued slot immediately.
    for (const job of queue.snapshot()) cancel(job)
    if (active) cancel(active)
    return Object.freeze({ quiescent: active === undefined })
  }
  function expire(job: OwnedRequest) {
    if (job.settled) {
      if (job === active) shutdown()
      return
    }
    const running = job === active
    if (!running) queue.remove(job)
    event(job, { kind: 'failed', reason: 'deadline' })
    settle(job, {
      kind: 'failed',
      reason: 'deadline',
      execution: running ? 'unknown' : 'not-started',
    })
    if (running) shutdown() // Unknown executor completion must never permit overlap.
    job.controller.abort()
  }
  function drain() {
    if (active || closed) return
    const next = queue.dequeue()
    if (next.kind === 'empty') return
    const job = next.value
    if (clock.now() >= job.expiresAt) {
      expire(job)
      drain()
      return
    }
    active = job
    event(job, { kind: 'started' })
    void run(job)
  }
  async function run(job: OwnedRequest) {
    try {
      const result = copyExecution(
        await execute(job.request, job.controller.signal),
      )
      if (clock.now() >= job.expiresAt) expire(job)
      if (!job.settled) {
        event(job, result)
        settle(job, result)
      }
    } catch {
      if (!job.settled) {
        event(job, { kind: 'failed', reason: 'executor' })
        settle(job, {
          kind: 'failed',
          reason: 'executor',
          execution: 'unknown',
        })
      }
    } finally {
      // Only executor settlement releases active ownership, even after abort.
      job.stopTimer()
      owned.delete(job.request.requestId)
      active = undefined
      drain()
    }
  }
  function submit(request: CommitDescriptor): Admission {
    const descriptor = copyDescriptor(request, config.repositoryId)
    const reason = !descriptor
      ? 'invalid'
      : closed
        ? 'closed'
        : owned.has(descriptor.requestId)
          ? 'duplicate'
          : owned.size >= config.capacity
            ? 'full'
            : undefined
    if (reason || !descriptor) {
      if (descriptor)
        events.append({
          kind: 'rejected',
          reason: reason ?? 'invalid',
          requestId: descriptor.requestId,
          repositoryId: config.repositoryId,
        })
      return rejectAdmission(reason ?? 'invalid')
    }
    const job = createOwnedRequest(descriptor, clock.now() + config.deadlineMs)
    owned.set(descriptor.requestId, job)
    queue.enqueue(job) // owned.size admission check guarantees a free ring slot.
    event(job, { kind: 'admitted' })
    job.stopTimer = clock.arm(config.deadlineMs, () => expire(job))
    if (!drainScheduled) {
      drainScheduled = true
      queueMicrotask(() => {
        drainScheduled = false
        drain()
      })
    }
    return Object.freeze({
      kind: 'admitted',
      completion: job.completion,
      cancel: () => cancel(job),
    })
  }
  return Object.freeze({
    submit,
    shutdown,
    events: events.snapshot,
    inspect: () =>
      Object.freeze({
        pending: owned.size,
        queued: queue.inspect().occupancy,
        active: active !== undefined,
        closed,
        diagnosticsExhausted: events.inspect().exhausted,
      }),
  })
}
