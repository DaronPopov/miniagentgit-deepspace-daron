import { useEffect, useMemo, useRef, useState } from 'react'
import type { AuthState, SessionState } from './contracts'
import { createSessionClient } from './session-client'
import { AuthShell } from './auth-shell'
import { AuthControls } from './auth-controls'
import {
  browserOrigin,
  managedSignIn,
  managedSignOut,
  returnToPublicPage,
  sdkCredential,
  useManagedSession,
} from './sdk'

function SessionView({ snapshot }: { readonly snapshot: SessionState }) {
  const client = useMemo(
    () =>
      createSessionClient({
        origin: browserOrigin(),
        fetch: (...args) => fetch(...args),
        ...sdkCredential,
      }),
    [],
  )
  const [state, setState] = useState<AuthState>(
    snapshot.status === 'signed-in' ? { status: 'checking' } : snapshot,
  )
  const [busy, setBusy] = useState(false)
  const blocked = useRef(false)
  useEffect(() => {
    if (blocked.current || snapshot.status !== 'signed-in') {
      client.invalidate()
      return
    }
    client.update(snapshot.session)
    let mounted = true
    const timer = setTimeout(
      () => {
        blocked.current = true
        client.invalidate()
        if (mounted) setState({ status: 'expired' })
      },
      Math.min(snapshot.session.expiresAt - Date.now(), 2147483647),
    )
    void client.read('/api/me').then((result) => {
      if (!mounted || blocked.current) return
      setState(
        result.status === 'ok'
          ? { status: 'signed-in', subject: snapshot.session.subject }
          : {
              status:
                result.status === 'expired' ? 'expired' : 'token-unavailable',
            },
      )
    })
    return () => {
      mounted = false
      clearTimeout(timer)
      client.invalidate()
    }
  }, [client, snapshot])
  async function onAction(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch {
      setState({ status: 'error' })
    } finally {
      setBusy(false)
    }
  }
  const actions = {
    signIn: async (provider: Parameters<typeof managedSignIn>[0]) => {
      blocked.current = true
      client.invalidate()
      await managedSignIn(provider)
    },
    signOut: async () => {
      blocked.current = true
      client.invalidate()
      setState({ status: 'loading' })
      await managedSignOut()
      returnToPublicPage()
    },
  }
  return (
    <AuthShell state={state}>
      {!['loading', 'unavailable', 'checking'].includes(state.status) && (
        <AuthControls
          authenticated={
            snapshot.status === 'signed-in' &&
            state.status !== 'signed-out' &&
            state.status !== 'expired'
          }
          busy={busy}
          actions={actions}
          onAction={onAction}
        />
      )}
    </AuthShell>
  )
}
export function AuthSession() {
  const snapshot = useManagedSession()
  const key =
    snapshot.status === 'signed-in'
      ? `${snapshot.session.subject}:${snapshot.session.sessionId}:${snapshot.session.expiresAt}`
      : snapshot.status
  return <SessionView key={key} snapshot={snapshot} />
}
