import type { AuthActions } from './contracts'

export function AuthControls({
  authenticated,
  busy,
  actions,
  onAction,
}: {
  readonly authenticated: boolean
  readonly busy: boolean
  readonly actions: AuthActions
  readonly onAction: (action: () => Promise<void>) => Promise<void>
}) {
  return (
    <div className="site-actions">
      {authenticated ? (
        <button
          className="site-button site-button-secondary"
          disabled={busy}
          type="button"
          onClick={() => void onAction(actions.signOut)}
        >
          Sign out
        </button>
      ) : (
        <>
          <button
            className="site-button site-button-secondary"
            disabled={busy}
            type="button"
            onClick={() => void onAction(() => actions.signIn('github'))}
          >
            Continue with GitHub
          </button>
          <button
            className="site-button site-button-secondary"
            disabled={busy}
            type="button"
            onClick={() => void onAction(() => actions.signIn('google'))}
          >
            Continue with Google
          </button>
        </>
      )}
    </div>
  )
}
