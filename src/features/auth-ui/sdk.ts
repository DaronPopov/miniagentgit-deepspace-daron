import {
  clearAuthToken,
  getAuthToken,
  signOut,
  useAuth,
  useSession,
} from 'deepspace'
import type { Provider } from './contracts'
import { sessionState } from './session-state'

export { DeepSpaceAuthProvider } from 'deepspace'
export const sdkCredential = {
  getToken: getAuthToken,
  clearToken: clearAuthToken,
} as const
export function useManagedSession() {
  const auth = useAuth(),
    session = useSession()
  const data = session.data
  return sessionState(
    {
      pending: session.isPending || session.isRefetching,
      failed: !!session.error,
      signedIn: auth.isSignedIn,
      subject: auth.userId === data?.user.id ? auth.userId : null,
      sessionId: auth.sessionId,
      expiresAt: data?.session.expiresAt.getTime() ?? NaN,
    },
    Date.now(),
  )
}
export async function managedSignIn(provider: Provider) {
  clearAuthToken()
  // Same managed redirect used by the installed SDK's AuthOverlay.
  window.location.assign(`/api/auth/social-redirect?provider=${provider}`)
}
export async function managedSignOut() {
  const response = await signOut()
  if (response.error) throw new Error('Sign-out unavailable')
}
export function returnToPublicPage() {
  window.location.assign('/')
}
export const browserOrigin = () => window.location.origin
