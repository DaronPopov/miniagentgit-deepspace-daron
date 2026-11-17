import type {
  CommitDescriptor,
  ScheduledOutcome,
} from '../contracts/commit-scheduling'

/** The runtime owns this record until executor settlement, not just caller settlement. */
export interface OwnedRequest {
  readonly request: CommitDescriptor
  readonly controller: AbortController
  readonly completion: Promise<ScheduledOutcome>
  readonly resolve: (outcome: ScheduledOutcome) => void
  readonly expiresAt: number
  stopTimer: () => void
  settled: boolean
}
export function createOwnedRequest(
  request: CommitDescriptor,
  expiresAt: number,
): OwnedRequest {
  let resolve!: (outcome: ScheduledOutcome) => void // Promise constructor initializes synchronously.
  const completion = new Promise<ScheduledOutcome>((done) => {
    resolve = done
  })
  return {
    request,
    expiresAt,
    completion,
    resolve,
    controller: new AbortController(),
    stopTimer: () => {},
    settled: false,
  }
}
