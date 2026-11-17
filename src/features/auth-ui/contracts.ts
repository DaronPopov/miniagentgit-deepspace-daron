export type Provider = 'github' | 'google'
export interface BrowserSession {
  readonly subject: string
  readonly sessionId: string
  readonly expiresAt: number
}
export type SessionState =
  | { readonly status: 'loading' | 'signed-out' | 'expired' | 'error' }
  | { readonly status: 'signed-in'; readonly session: BrowserSession }
export type AuthState =
  | {
      readonly status:
        | 'loading'
        | 'signed-out'
        | 'expired'
        | 'error'
        | 'unavailable'
        | 'checking'
        | 'token-unavailable'
    }
  | { readonly status: 'signed-in'; readonly subject: string }
export type ProtectedResult =
  | { readonly status: 'ok'; readonly value: unknown }
  | {
      readonly status:
        | 'signed-out'
        | 'expired'
        | 'unavailable'
        | 'cancelled'
        | 'forbidden'
        | 'invalid'
        | 'error'
    }
export interface AuthActions {
  readonly signIn: (provider: Provider) => Promise<void>
  readonly signOut: () => Promise<void>
}
