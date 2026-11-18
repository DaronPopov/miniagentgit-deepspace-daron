import type { ReactNode } from 'react'
import { authenticationConfigured } from './configuration'
import { DeepSpaceAuthProvider } from './sdk'
import { AuthSession } from './auth-session'
import { AuthShell } from './auth-shell'

/** Shared by the home entry and dashboard. Public docs remain outside it. */
export function AuthBoundary({ children }: { readonly children?: ReactNode }) {
  if (!authenticationConfigured())
    return <AuthShell state={{ status: 'unavailable' }} />
  return (
    <DeepSpaceAuthProvider>
      <AuthSession>{children}</AuthSession>
    </DeepSpaceAuthProvider>
  )
}
