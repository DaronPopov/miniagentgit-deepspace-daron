export type CommitEventDetail =
  | { readonly kind: 'admitted' | 'started' }
  | { readonly kind: 'committed'; readonly commitId: string }
  | { readonly kind: 'conflict'; readonly actualHead: string | null }
  | {
      readonly kind: 'rejected'
      readonly reason:
        | 'full'
        | 'closed'
        | 'invalid'
        | 'duplicate'
        | 'quota'
        | 'forbidden'
        | 'not-found'
    }
  | { readonly kind: 'cancelled'; readonly phase: 'queued' | 'active' }
  | { readonly kind: 'failed'; readonly reason: 'executor' | 'deadline' }
export type CommitEventInput = CommitEventDetail & {
  readonly requestId: string
  readonly repositoryId: string
}
export type CommitEvent = CommitEventInput & { readonly sequence: number }
