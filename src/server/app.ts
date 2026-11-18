import {
  admissionLane,
  admitRequest,
  withProtectedAdmission,
} from './admission/control'
import type { AdmissionEnvironment } from './admission/control'
import { registerRepositoryTools } from './deepspace/agent-tools'
import { Hono } from 'hono'
import {
  createManagedAuthRoutes,
  type ManagedAuthEnvironment,
} from './deepspace/managed-auth'
import { resultResponse } from './api/result'
import { workerErrorHandler } from 'deepspace/worker'
import { createHealthRoutes } from './api/health'
import { createPrincipalRoutes } from './api/principal'
import { createRepositoryRoutes } from './api/repositories'
import { routeRepository } from './storage/routing'
import type { AuthEnvironment } from './deepspace/auth'

export interface Env
  extends AuthEnvironment, ManagedAuthEnvironment, AdmissionEnvironment {
  REPOSITORY_ROOMS: DurableObjectNamespace
  ASSETS: Fetcher
  OWNER_USER_ID: string
  readonly APP_NAME: string
  readonly DEEPSPACE_APP_ID: string
}

export function createApp(enforceAdmission = false) {
  const app = new Hono<{ Bindings: Env }>()
  if (enforceAdmission)
    app.use('*', async (c, next) => {
      const lane = admissionLane(c.req.path)
      if (lane === 'protected') {
        const result = await withProtectedAdmission(c.env, next, (release) =>
          c.executionCtx.waitUntil(release),
        )
        if (!result.ok) return resultResponse(result)
        return
      }
      if (lane === 'auth' || lane === 'token') {
        const admitted = await admitRequest(c.env, lane)
        if (!admitted.ok) return resultResponse(admitted)
      }
      await next()
    })
  registerRepositoryTools(app, enforceAdmission)
  app.route('/api/auth', createManagedAuthRoutes())
  app.route('/api', createHealthRoutes())
  app.route('/api', createPrincipalRoutes(enforceAdmission))
  app.route(
    '/api',
    createRepositoryRoutes<Env>((env, id) => {
      const owner = routeRepository(env.REPOSITORY_ROOMS, id)
      if (!owner.ok) throw new Error('Invalid owner route')
      return { fetch: (request) => owner.value.fetch(request) }
    }, enforceAdmission),
  )
  app.all('/api/*', () =>
    resultResponse({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Unknown API endpoint' },
    }),
  )
  app.get('/', (c) => c.env.ASSETS.fetch(c.req.raw))
  app.get('/dashboard', (c) =>
    c.env.ASSETS.fetch(new Request(new URL('/', c.req.url), c.req.raw)),
  )
  app.get('/docs', (c) =>
    c.env.ASSETS.fetch(new Request(new URL('/', c.req.url), c.req.raw)),
  )
  app.notFound((c) => c.json({ error: 'not_found' }, 404))
  app.onError(workerErrorHandler('error'))
  return app
}
