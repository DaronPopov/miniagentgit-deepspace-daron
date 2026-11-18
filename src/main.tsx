import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { routes } from '@generouted/react-router/lazy'
import {
  createBrowserRouter,
  RouterProvider,
  useRouteError,
} from 'react-router'
import './styles.css'

function RouteLoading() {
  return (
    <main className="site-container site-intro">
      <p role="status">Loading page…</p>
    </main>
  )
}

function RouteError() {
  const error = useRouteError()
  const moduleFailed =
    error instanceof Error &&
    /dynamically imported module|loading (?:css )?chunk|unable to preload|importing a module script/i.test(
      error.message,
    )
  return (
    <main className="site-container site-intro">
      <h1>
        {moduleFailed
          ? 'This page didn’t finish loading'
          : 'Something went wrong'}
      </h1>
      <p>
        {moduleFailed
          ? 'The app may have updated or the connection was interrupted. Reload to try again.'
          : 'Reload the page to try again.'}
      </p>
      <div className="site-actions">
        <button
          className="site-button site-button-primary"
          type="button"
          onClick={() => window.location.reload()}
        >
          Reload page
        </button>
        <a href="/">Go to homepage</a>
      </div>
    </main>
  )
}

const router = createBrowserRouter(
  routes.map((route) => ({
    ...route,
    HydrateFallback: RouteLoading,
    ErrorBoundary: RouteError,
  })),
)
const root = document.getElementById('root')
if (!root) throw new Error('Missing application root')
createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
