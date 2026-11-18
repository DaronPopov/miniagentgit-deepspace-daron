import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { ProtectedResult } from '../auth-ui/contracts'

export type Read = (
  path: string,
  signal: AbortSignal,
) => Promise<ProtectedResult>
type ErrorStatus = Exclude<ProtectedResult['status'], 'ok'>
const messages: Record<ErrorStatus, string> = {
  'signed-out': 'Sign in to read this resource.',
  expired: 'Your session has expired.',
  unavailable:
    'Identity verification or request capacity is temporarily unavailable.',
  'identity-mismatch': 'The verified identity changed.',
  cancelled: 'The request was cancelled.',
  timeout: 'The request timed out.',
  forbidden: 'Access denied. This resource belongs to another account.',
  missing: 'This resource was not found.',
  conflict: 'The server reported a conflict.',
  invalid: 'The server rejected this request.',
  error:
    'The resource could not be loaded. Check your connection and try again.',
}
type View<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'ok'; readonly value: T }
  | { readonly status: ErrorStatus }

function ReadAttempt<T>({
  read,
  path,
  decode,
  children,
  pending,
}: {
  readonly read: Read
  readonly path: string
  readonly decode: (value: unknown) => T | undefined
  readonly children: (value: T) => ReactNode
  readonly pending?: string
}) {
  const [state, setState] = useState<View<T>>({ status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    void read(path, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      if (result.status !== 'ok') return setState({ status: result.status })
      const value = decode(result.value)
      setState(
        value === undefined ? { status: 'error' } : { status: 'ok', value },
      )
    })
    return () => controller.abort()
  }, [read, path, decode])
  if (state.status === 'ok') return children(state.value)
  return (
    <p role="status" className="dashboard-feedback">
      {state.status === 'loading'
        ? 'Loading…'
        : state.status === 'conflict' && pending
          ? pending
          : messages[state.status]}
    </p>
  )
}

export function ReadPanel<T>({
  refresh,
  ...props
}: Parameters<typeof ReadAttempt<T>>[0] & { readonly refresh: string }) {
  const [revision, setRevision] = useState(0)
  return (
    <>
      <ReadAttempt key={JSON.stringify([props.path, revision])} {...props} />
      <button
        className="site-button site-button-secondary site-button-compact"
        type="button"
        onClick={() => setRevision((value) => value + 1)}
      >
        {refresh}
      </button>
    </>
  )
}
