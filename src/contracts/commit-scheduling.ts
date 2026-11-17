import type { CommitEvent } from './commit-events'
export interface CommitDescriptor {
  readonly requestId: string
  readonly repositoryId: string
  readonly preparedRef: string
  readonly actorSubject: string
  readonly expectedHead: string | null
  readonly idempotencyKey: string
}
export type ExecutionOutcome =
  | { readonly kind: 'committed'; readonly commitId: string }
  | { readonly kind: 'conflict'; readonly actualHead: string | null }
  | {
      readonly kind: 'rejected'
      readonly reason: 'quota' | 'forbidden' | 'invalid' | 'not-found'
    }
export type ScheduledOutcome =
  | ExecutionOutcome
  | {
      readonly kind: 'cancelled'
      readonly execution: 'not-started' | 'unknown'
    }
  | {
      readonly kind: 'failed'
      readonly reason: 'executor' | 'deadline'
      readonly execution: 'unknown' | 'not-started'
    }
export type Admission =
  | {
      readonly kind: 'rejected'
      readonly code: 'QUOTA_EXCEEDED' | 'UNAVAILABLE' | 'INVALID_INPUT'
      readonly reason: 'full' | 'closed' | 'invalid' | 'duplicate'
    }
  | {
      readonly kind: 'admitted'
      readonly completion: Promise<ScheduledOutcome>
      readonly cancel: () => boolean
    }
export interface SchedulerClock {
  readonly now: () => number
  /** Must schedule asynchronously, fire once, and return an idempotent cleanup. */
  readonly arm: (milliseconds: number, callback: () => void) => () => void
}
export interface SchedulerOptions {
  readonly repositoryId: string
  readonly capacity?: number
  readonly eventCapacity?: number
  readonly deadlineMs?: number
  readonly clock?: SchedulerClock
  /** Must honor abort before starting a transaction; settlement releases ownership. */
  readonly execute: (
    request: CommitDescriptor,
    signal: AbortSignal,
  ) => Promise<ExecutionOutcome>
}
export interface CommitScheduler {
  readonly submit: (request: CommitDescriptor) => Admission
  readonly shutdown: () => Readonly<{ quiescent: boolean }>
  readonly inspect: () => Readonly<{
    pending: number
    queued: number
    active: boolean
    closed: boolean
    diagnosticsExhausted: boolean
  }>
  readonly events: () => readonly CommitEvent[]
}
