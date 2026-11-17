import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { getHealth } from '../src/application/health'
import { createHealthRoutes } from '../src/server/api/health'

describe('foundation health API', () => {
  it('returns the shared liveness contract', async () => {
    const app = new Hono().route('/api', createHealthRoutes())
    const response = await app.request('/api/health')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toEqual({
      status: 'ok',
      service: 'miniagentgit',
    })
    expect(getHealth()).toEqual({ status: 'ok', service: 'miniagentgit' })
  })

  it('does not accept writes or expose repository operations', async () => {
    const app = new Hono().route('/api', createHealthRoutes())
    expect((await app.request('/api/health', { method: 'POST' })).status).toBe(
      404,
    )
    expect((await app.request('/api/commits')).status).toBe(404)
  })
})
