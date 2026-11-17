import type {
  Admission,
  CommitDescriptor,
  ExecutionOutcome,
  SchedulerClock,
  SchedulerOptions,
} from '../contracts/commit-scheduling'
import { commitId, idempotencyKey, repositoryId } from '../domain/validation'

export const systemSchedulerClock: SchedulerClock = Object.freeze({
  now: () => performance.now(),
  arm(milliseconds: number, callback: () => void) {
    const timer = setTimeout(callback, milliseconds)
    return () => clearTimeout(timer)
  },
})
export function schedulerConfiguration(options: SchedulerOptions) {
  const capacity = options.capacity ?? 8
  const eventCapacity = options.eventCapacity ?? 64
  const deadlineMs = options.deadlineMs ?? 5000
  if (
    !repositoryId(options.repositoryId).ok ||
    !Number.isSafeInteger(capacity) ||
    capacity < 1 ||
    capacity > 32 ||
    !Number.isSafeInteger(eventCapacity) ||
    eventCapacity < 1 ||
    eventCapacity > 256 ||
    !Number.isSafeInteger(deadlineMs) ||
    deadlineMs < 1 ||
    deadlineMs > 30000
  )
    throw new RangeError('Invalid scheduler configuration')
  return Object.freeze({
    repositoryId: options.repositoryId,
    capacity,
    eventCapacity,
    deadlineMs,
  })
}
export function copyDescriptor(
  request: CommitDescriptor,
  owner: string,
): CommitDescriptor | undefined {
  if (
    request.repositoryId !== owner ||
    !/^req_[a-z0-9]{16,32}$/.test(request.requestId) ||
    !commitId(request.preparedRef).ok ||
    !idempotencyKey(request.idempotencyKey).ok ||
    typeof request.actorSubject !== 'string' ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(request.actorSubject) ||
    (request.expectedHead !== null && !commitId(request.expectedHead).ok)
  )
    return undefined
  return Object.freeze({
    requestId: request.requestId,
    repositoryId: owner,
    preparedRef: request.preparedRef,
    actorSubject: request.actorSubject,
    expectedHead: request.expectedHead,
    idempotencyKey: request.idempotencyKey,
  })
}
export function copyExecution(result: ExecutionOutcome): ExecutionOutcome {
  if (result?.kind === 'committed' && commitId(result.commitId).ok)
    return { kind: result.kind, commitId: result.commitId }
  if (
    result?.kind === 'conflict' &&
    (result.actualHead === null || commitId(result.actualHead).ok)
  )
    return { kind: result.kind, actualHead: result.actualHead }
  if (
    result?.kind === 'rejected' &&
    ['quota', 'forbidden', 'invalid', 'not-found'].includes(result.reason)
  )
    return { kind: result.kind, reason: result.reason }
  throw new Error('Invalid executor outcome')
}

export function rejectAdmission(
  reason: 'full' | 'closed' | 'invalid' | 'duplicate',
): Admission {
  return Object.freeze({
    kind: 'rejected',
    reason,
    code:
      reason === 'full'
        ? 'QUOTA_EXCEEDED'
        : reason === 'closed'
          ? 'UNAVAILABLE'
          : 'INVALID_INPUT',
  })
}
