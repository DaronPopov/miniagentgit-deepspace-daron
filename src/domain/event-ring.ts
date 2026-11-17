import { commitId, repositoryId } from './validation'
import { createBoundedRing } from './bounded-ring'
import type {
  CommitEvent,
  CommitEventDetail,
  CommitEventInput,
} from '../contracts/commit-events'

function detail(event: CommitEventDetail): CommitEventDetail {
  switch (event.kind) {
    case 'admitted':
    case 'started':
      return { kind: event.kind }
    case 'committed':
      return { kind: event.kind, commitId: event.commitId }
    case 'conflict':
      return { kind: event.kind, actualHead: event.actualHead }
    case 'rejected':
      return { kind: event.kind, reason: event.reason }
    case 'cancelled':
      return { kind: event.kind, phase: event.phase }
    case 'failed':
      return { kind: event.kind, reason: event.reason }
  }
}

/** Best-effort diagnostics, never an admission queue or durable audit log. */
export function createEventRing(capacity: number, initialSequence = 0) {
  if (
    !Number.isSafeInteger(capacity) ||
    capacity < 1 ||
    capacity > 256 ||
    !Number.isSafeInteger(initialSequence) ||
    initialSequence < 0
  )
    throw new RangeError('Invalid event ring bounds')
  const ring = createBoundedRing<CommitEvent>(capacity)
  let sequence = initialSequence
  return Object.freeze({
    append(event: CommitEventInput): {
      readonly kind: 'recorded' | 'sequence-exhausted' | 'invalid'
    } {
      if (
        !repositoryId(event.repositoryId).ok ||
        !/^req_[a-z0-9]{16,32}$/.test(event.requestId) ||
        (event.kind === 'committed' && !commitId(event.commitId).ok) ||
        (event.kind === 'conflict' &&
          event.actualHead !== null &&
          !commitId(event.actualHead).ok)
      )
        return { kind: 'invalid' }
      if (sequence === Number.MAX_SAFE_INTEGER)
        return { kind: 'sequence-exhausted' }
      // Copy only whitelisted flat metadata; never retain the caller's object.
      const entry = Object.freeze({
        ...detail(event),
        requestId: event.requestId,
        repositoryId: event.repositoryId,
        sequence: ++sequence,
      })
      if (ring.inspect().occupancy === capacity) ring.dequeue()
      ring.enqueue(entry)
      return { kind: 'recorded' }
    },
    snapshot: ring.snapshot,
    inspect: () =>
      Object.freeze({
        ...ring.inspect(),
        sequence,
        exhausted: sequence === Number.MAX_SAFE_INTEGER,
      }),
  })
}
