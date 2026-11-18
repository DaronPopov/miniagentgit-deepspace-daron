import { Hono } from 'hono'
import type { CiEngine } from '../../application/ci/service'
import { registerCiRoutes } from './ci'
import type { Principal } from '../../domain/repository'
import type { RepositoryService } from '../../application/repository-service'
import { validateCommit } from '../../application/validate-commit'
import { commitId, filePath, idempotencyKey } from '../../domain/validation'
import { invalid } from '../../domain/result'
import { authenticate } from '../deepspace/auth'
import type { AuthEnvironment } from '../deepspace/auth'
import { readJsonRequest } from './request'
import { resultResponse } from './result'

/** Runs inside the authoritative owner as well as the local SQLite HTTP tests. */
export function createOwnerRoutes(
  id: string,
  service: RepositoryService,
  env: AuthEnvironment,
  ci?: CiEngine,
  policy = { base: '/api/repositories', authenticate },
) {
  const app = new Hono<{ Variables: { actor: Principal } }>()
  const base = `${policy.base}/${id}`
  app.use('*', async (c, next) => {
    if (c.req.url.length > 2048)
      return resultResponse(invalid('Repository URL exceeds 2048 characters'))
    const identity = await policy.authenticate(c.req.raw, env)
    if (!identity.ok) return resultResponse(identity)
    const url = new URL(c.req.url)
    if (
      url.search &&
      !url.pathname.endsWith('/tree') &&
      !url.pathname.startsWith(`${base}/files/`) &&
      url.pathname !== `${base}/ci/jobs`
    )
      return resultResponse(invalid('Unexpected query parameters'))
    if (c.req.method !== 'PUT') {
      const permission = await service.readRepository({
        repositoryId: id,
        actor: identity.value,
      })
      if (!permission.ok) return resultResponse(permission)
    }
    c.set('actor', identity.value)
    await next()
  })
  app.put(base, async (c) => {
    if ([...new URL(c.req.url).searchParams].length)
      return resultResponse(invalid('Unexpected query parameters'))
    const body = await readJsonRequest(c.req.raw)
    return resultResponse(
      body.ok ? await service.initialize(c.get('actor'), body.value) : body,
    )
  })
  app.get(base, async (c) =>
    resultResponse(
      await service.readRepository({ repositoryId: id, actor: c.get('actor') }),
    ),
  )
  app.get(`${base}/head`, async (c) =>
    resultResponse(
      await service.readHead({ repositoryId: id, actor: c.get('actor') }),
    ),
  )
  app.post(`${base}/commits`, async (c) => {
    const body = await readJsonRequest(c.req.raw)
    if (!body.ok) return resultResponse(body)
    const parsed = validateCommit(body.value)
    if (!parsed.ok) return resultResponse(parsed)
    return resultResponse(
      await service.createCommit(
        { repositoryId: id, actor: c.get('actor') },
        parsed.value,
        c.req.raw.signal,
      ),
    )
  })
  app.get(`${base}/commits/:commit`, async (c) => {
    const parsed = commitId(c.req.param('commit'))
    return resultResponse(
      parsed.ok
        ? await service.readCommit(
            { repositoryId: id, actor: c.get('actor') },
            parsed.value,
          )
        : parsed,
    )
  })
  app.get(`${base}/tree`, async (c) => {
    const query = new URL(c.req.url).searchParams
    if (
      [...query.keys()].some(
        (key) => !['commit', 'limit', 'cursor'].includes(key),
      ) ||
      [...query.keys()].some((key) => query.getAll(key).length !== 1)
    )
      return resultResponse(invalid('Invalid tree query'))
    const selected = query.get('commit')
    if (selected !== null && !commitId(selected).ok)
      return resultResponse(invalid('Invalid commit ID'))
    const limit = query.get('limit') ?? '25'
    if (!/^\d{1,3}$/.test(limit))
      return resultResponse(invalid('Invalid page size'))
    return resultResponse(
      await service.listTree(
        { repositoryId: id, actor: c.get('actor') },
        selected,
        { limit: Number(limit), cursor: query.get('cursor') },
      ),
    )
  })
  app.get(`${base}/files/:commit`, async (c) => {
    const commit = commitId(c.req.param('commit'))
    const query = new URL(c.req.url).searchParams
    const path = filePath(query.get('path'))
    if (
      [...query.keys()].some((key) => key !== 'path') ||
      query.getAll('path').length !== 1
    )
      return resultResponse(invalid('Invalid file query'))
    return resultResponse(
      !commit.ok
        ? commit
        : !path.ok
          ? path
          : await service.readFile(
              { repositoryId: id, actor: c.get('actor') },
              commit.value,
              path.value,
            ),
    )
  })
  app.get(`${base}/idempotency/:key`, async (c) => {
    const key = idempotencyKey(c.req.param('key'))
    return resultResponse(
      key.ok
        ? await service.replay(
            { repositoryId: id, actor: c.get('actor') },
            key.value,
          )
        : key,
    )
  })
  if (ci) registerCiRoutes(app, id, ci, base)
  app.onError(() =>
    resultResponse({
      ok: false,
      error: {
        code: 'UNAVAILABLE',
        message:
          'Repository operation failed; retry with the same idempotency key',
      },
    }),
  )
  app.notFound(() =>
    resultResponse({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Unknown repository endpoint' },
    }),
  )
  return app
}
