import { Hono } from 'hono'
import type { Context } from 'hono'
import { repositoryIdentity } from '../../domain/commit-hashing'
import { invalid } from '../../domain/result'
import { repositoryId } from '../../domain/validation'
import { validateCreateRepository } from '../../application/validate-inputs'
import { authenticate } from '../deepspace/auth'
import type { AuthEnvironment } from '../deepspace/auth'
import { readJsonRequest } from './request'
import { resultResponse } from './result'

export type ResolveOwner = (id: string) => {
  readonly fetch: (request: Request) => Promise<Response>
}
export function createRepositoryRoutes<E extends AuthEnvironment>(
  resolve: (env: E, id: string) => ReturnType<ResolveOwner>,
) {
  const app = new Hono<{ Bindings: E }>()
  app.use('*', async (c, next) => {
    if (c.req.url.length > 2048)
      return resultResponse(invalid('Repository URL exceeds 2048 characters'))
    await next()
  })
  app.post('/repositories', async (c) => {
    const identity = await authenticate(c.req.raw, c.env)
    if (!identity.ok) return resultResponse(identity)
    if (new URL(c.req.url).search)
      return resultResponse(invalid('Unexpected query parameters'))
    const body = await readJsonRequest(c.req.raw)
    if (!body.ok) return resultResponse(body)
    const input = validateCreateRepository(body.value)
    if (!input.ok) return resultResponse(input)
    const id = await repositoryIdentity(
      identity.value,
      input.value.idempotencyKey,
    )
    const url = new URL(c.req.url)
    url.pathname = `/api/repositories/${id}`
    url.search = ''
    const headers = new Headers({
      authorization: c.req.header('authorization') ?? '',
      'content-type': 'application/json',
    })
    return resolve(c.env, id).fetch(
      new Request(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(input.value),
        signal: c.req.raw.signal,
      }),
    )
  })
  app.all('/repositories/:id/*', forward)
  app.get('/repositories/:id', forward)
  async function forward(c: Context<{ Bindings: E }>) {
    const identity = await authenticate(c.req.raw, c.env)
    if (!identity.ok) return resultResponse(identity)
    const id = repositoryId(c.req.param('id'))
    if (!id.ok) return resultResponse(id)
    // Forward the bearer, never synthetic user/owner/permission headers.
    const headers = new Headers(c.req.raw.headers)
    for (const name of [...headers.keys()])
      if (name.startsWith('x-')) headers.delete(name)
    const request = new Request(c.req.raw, { headers })
    return resolve(c.env, id.value).fetch(request)
  }
  app.onError(() =>
    resultResponse({
      ok: false,
      error: { code: 'UNAVAILABLE', message: 'Owner dispatch unavailable' },
    }),
  )
  return app
}
