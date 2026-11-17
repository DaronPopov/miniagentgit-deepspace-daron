export type DomainError =
  | { readonly code: 'INVALID_INPUT'; readonly message: string }
  | {
      readonly code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
      readonly message: string
    }
  | {
      readonly code: 'CONFLICT'
      readonly message: string
      readonly actualHead: string | null
    }
  | {
      readonly code: 'QUOTA_EXCEEDED'
      readonly resource: string
      readonly maximum: number
      readonly actual?: number
    }
  | { readonly code: 'UNAVAILABLE'; readonly message: string }

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: DomainError }

export const success = <T>(value: T): Result<T> => ({ ok: true, value })
export const invalid = (message: string): Result<never> => ({
  ok: false,
  error: { code: 'INVALID_INPUT', message },
})
