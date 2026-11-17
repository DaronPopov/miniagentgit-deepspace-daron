import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { routes } from '@generouted/react-router/lazy'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing application root')
createRoot(root).render(
  <StrictMode>
    <RouterProvider router={createBrowserRouter(routes)} />
  </StrictMode>,
)
