import { Hono } from 'hono'
import { resultResponse } from './api/result'
import { workerErrorHandler } from 'deepspace/worker'
import { createHealthRoutes } from './api/health'
import { createPrincipalRoutes } from './api/principal'
import { createRepositoryRoutes } from './api/repositories'
import { routeRepository } from './storage/routing'
import type { AuthEnvironment } from './deepspace/auth'

export interface Env extends AuthEnvironment {
  REPOSITORY_ROOMS: DurableObjectNamespace
  ASSETS: Fetcher
  OWNER_USER_ID: string
}

export function createApp() {
  const app = new Hono<{ Bindings: Env }>()
  app.route('/api', createHealthRoutes())
  app.route('/api', createPrincipalRoutes())
  app.route(
    '/api',
    createRepositoryRoutes<Env>((env, id) => {
      const owner = routeRepository(env.REPOSITORY_ROOMS, id)
      if (!owner.ok) throw new Error('Invalid owner route')
      return { fetch: (request) => owner.value.fetch(request) }
    }),
  )
  app.all('/api/*', () =>
    resultResponse({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Unknown API endpoint' },
    }),
  )
  app.get('/', (c) => c.env.ASSETS.fetch(c.req.raw))
  app.notFound((c) => c.json({ error: 'not_found' }, 404))
  app.onError(workerErrorHandler('error'))
  return app
}
