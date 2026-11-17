import { authenticationConfigured } from './configuration'
import { DeepSpaceAuthProvider } from './sdk'
import { AuthSession } from './auth-session'
import { AuthShell } from './auth-shell'

/** Route scoped: public landing/docs never mount the SDK provider or hooks. */
export function AuthBoundary() {
  if (!authenticationConfigured())
    return <AuthShell state={{ status: 'unavailable' }} />
  return (
    <DeepSpaceAuthProvider>
      <AuthSession />
    </DeepSpaceAuthProvider>
  )
}
