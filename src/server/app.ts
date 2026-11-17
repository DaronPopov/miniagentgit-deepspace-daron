import { Hono } from 'hono'
import { workerErrorHandler } from 'deepspace/worker'
import { createHealthRoutes } from './api/health'

export interface Env {
  ASSETS: Fetcher
  OWNER_USER_ID: string
}

export function createApp() {
  const app = new Hono<{ Bindings: Env }>()
  app.route('/api', createHealthRoutes())
  app.all('/api/*', (c) => c.json({ error: 'not_found' }, 404))
  app.get('/', (c) => c.env.ASSETS.fetch(c.req.raw))
  app.notFound((c) => c.json({ error: 'not_found' }, 404))
  app.onError(workerErrorHandler('error'))
  return app
}
