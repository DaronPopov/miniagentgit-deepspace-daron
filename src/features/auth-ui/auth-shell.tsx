import { SiteContainer } from '../product-site/components/site-container'
import { SiteIcon } from '../product-site/components/site-icon'
import type { ReactNode } from 'react'
import type { AuthState } from './contracts'

const messages = {
  loading: 'Checking your session…',
  checking: 'Verifying API access…',
  'signed-out': 'Sign in to continue.',
  expired: 'Your session has expired. Sign in again.',
  error: 'Authentication failed. Please reload or try signing in again.',
  unavailable:
    'Authentication is unavailable until the application identity and hosted authentication are configured.',
  'token-unavailable':
    'An API credential is unavailable. Protected data has not been loaded.',
} as const
export function AuthShell({
  state,
  children,
}: {
  readonly state: AuthState
  readonly children?: ReactNode
}) {
  return (
    <div className="product-site auth-shell">
      <a className="site-skip-link" href="#main-content">
        Skip to content
      </a>
      <main id="main-content" tabIndex={-1}>
        <SiteContainer>
          <div className="site-intro">
            <p className="site-icon-label">
              <SiteIcon name="validation" />
              MiniAgentGit · Account
            </p>
            <h1>Your account</h1>
            <div role="status" aria-live="polite">
              {state.status === 'signed-in' ? (
                <>
                  <p>
                    Signed in as <strong>{state.subject}</strong>
                  </p>
                  <p>
                    Repository access is checked by the server for every
                    operation.
                  </p>
                </>
              ) : (
                <p>{messages[state.status]}</p>
              )}
            </div>
            {children}
            <nav aria-label="Account navigation" className="site-actions">
              <a href="/">Home</a>
              <a href="/docs">Documentation</a>
            </nav>
          </div>
        </SiteContainer>
      </main>
    </div>
  )
}
