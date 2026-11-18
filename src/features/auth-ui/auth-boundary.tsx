import { authenticationConfigured } from './configuration'
import { DeepSpaceAuthProvider } from './sdk'
import { AuthSession } from './auth-session'
import type { SignedInHome } from './auth-session'
import { AuthShell } from './auth-shell'

/** Shared by the home entry and dashboard. Public docs remain outside it. */
export function AuthBoundary({ home }: { readonly home?: SignedInHome }) {
  if (!authenticationConfigured())
    return <AuthShell state={{ status: 'unavailable' }} />
  return (
    <DeepSpaceAuthProvider>
      <AuthSession home={home} />
    </DeepSpaceAuthProvider>
  )
}
