import { Hono } from 'hono'
import type { RepositoryService } from '../../application/repository-service'
import { invalid } from '../../domain/result'
import { authenticateTool } from './agent-auth'
import type { AuthEnvironment } from './auth'
import { resultResponse } from '../api/result'

/** Binding-only HEAD read: reverify the original bearer and persisted owner. */
export function createAgentOwnerRoutes(
  id: string,
  service: RepositoryService,
  env: AuthEnvironment,
) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    if (c.req.method !== 'GET')
      return resultResponse({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Unknown agent owner endpoint' },
      })
    await next()
  })
  app.get(`/_deepspace/agent/repositories/${id}/head`, async (c) => {
    if (c.req.url.length > 2048 || new URL(c.req.url).search)
      return resultResponse(invalid('Invalid agent owner URL'))
    const identity = await authenticateTool(c.req.raw, env)
    return resultResponse(
      identity.ok
        ? await service.readHead({ repositoryId: id, actor: identity.value })
        : identity,
    )
  })
  app.notFound(() =>
    resultResponse({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Unknown agent owner endpoint' },
    }),
  )
  app.onError(() =>
    resultResponse({
      ok: false,
      error: { code: 'UNAVAILABLE', message: 'Repository read unavailable' },
    }),
  )
  return app
}
