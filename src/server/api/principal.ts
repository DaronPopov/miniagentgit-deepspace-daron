import { approve } from '../admission/control'
import { resultResponse } from './result'
import { Hono } from 'hono'
import { authenticate } from '../deepspace/auth'
import type { AuthEnvironment } from '../deepspace/auth'

export function createPrincipalRoutes(enforceAdmission = false) {
  const routes = new Hono<{
    Bindings: AuthEnvironment & { MINIGIT_TRUSTED_SUBJECTS?: string }
  }>()
  routes.get('/me', async (c) => {
    const result = await authenticate(c.req.raw, c.env)
    if (!result.ok)
      return c.json(result, result.error.code === 'UNAVAILABLE' ? 503 : 401)
    return resultResponse(
      enforceAdmission
        ? approve(c.env.MINIGIT_TRUSTED_SUBJECTS, result.value)
        : result,
    )
  })
  return routes
}
