import { useAuth } from 'deepspace'

export type BrowserIdentity =
  | { readonly status: 'loading' }
  | { readonly status: 'signed-out' }
  | { readonly status: 'signed-in'; readonly subject: string }

/** UI hint only. Never send this as trusted ownership or authorization input. */
export function useBrowserIdentity(): BrowserIdentity {
  const auth = useAuth()
  if (!auth.isLoaded) return { status: 'loading' }
  if (!auth.isSignedIn || !auth.userId) return { status: 'signed-out' }
  return { status: 'signed-in', subject: auth.userId }
}
