import type { SessionState } from './contracts'

export interface SessionInput {
  readonly pending: boolean
  readonly failed: boolean
  readonly signedIn: boolean
  readonly subject: string | null
  readonly sessionId: string | null
  readonly expiresAt: number
}
/** Browser identity is only a display hint; the API still verifies credentials. */
export function sessionState(input: SessionInput, now: number): SessionState {
  if (input.pending) return { status: 'loading' }
  if (input.failed) return { status: 'error' }
  if (!input.signedIn) return { status: 'signed-out' }
  if (!input.subject || !input.sessionId || !Number.isFinite(input.expiresAt))
    return { status: 'error' }
  if (input.expiresAt <= now) return { status: 'expired' }
  return {
    status: 'signed-in',
    session: {
      subject: input.subject,
      sessionId: input.sessionId,
      expiresAt: input.expiresAt,
    },
  }
}
