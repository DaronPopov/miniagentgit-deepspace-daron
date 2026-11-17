import {
  clearAuthToken,
  getAuthToken,
  signIn,
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
  const response = await signIn.social({
    provider,
    callbackURL: new URL('/dashboard', window.location.origin).href,
  })
  if (response.error) throw new Error('Sign-in unavailable')
}
export async function managedSignOut() {
  const response = await signOut()
  if (response.error) throw new Error('Sign-out unavailable')
}
export function returnToPublicPage() {
  window.location.assign('/')
}
export const browserOrigin = () => window.location.origin
