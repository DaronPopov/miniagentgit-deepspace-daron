import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { routes } from '@generouted/react-router/lazy'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './styles.css'

function RouteLoading() {
  return (
    <main className="site-container site-intro">
      <p role="status">Loading page…</p>
    </main>
  )
}

const router = createBrowserRouter(
  routes.map((route) => ({ ...route, HydrateFallback: RouteLoading })),
)
const root = document.getElementById('root')
if (!root) throw new Error('Missing application root')
createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
