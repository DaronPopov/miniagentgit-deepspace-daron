import type { Hono } from 'hono'
import type { Principal } from '../../domain/repository'
import type { CiEngine } from '../../application/ci/service'
import { commitId, objectValue } from '../../domain/validation'
import { invalid } from '../../domain/result'
import { readJsonRequest } from './request'
import { resultResponse } from './result'

/** Shared parent middleware authenticates and checks persisted repository ownership. */
export function registerCiRoutes(
  app: Hono<{ Variables: { actor: Principal } }>,
  repositoryId: string,
  engine: CiEngine,
) {
  const base = `/api/repositories/${repositoryId}/ci`
  app.post(`${base}/commits/:commit`, async (c) => {
    const commit = commitId(c.req.param('commit'))
    if (!commit.ok) return resultResponse(commit)
    const body = await readJsonRequest(c.req.raw, 2048)
    if (!body.ok) return resultResponse(body)
    if (
      !objectValue(body.value) ||
      Object.keys(body.value).some((key) => key !== 'pipelineId') ||
      (body.value.pipelineId !== undefined &&
        body.value.pipelineId !== 'miniagentgit-ci-v1')
    )
      return resultResponse(invalid('Invalid CI pipeline request'))
    return resultResponse(
      await engine.request(
        { repositoryId, actor: c.get('actor') },
        commit.value,
      ),
      202,
    )
  })
  app.get(`${base}/jobs`, (c) => {
    const query = new URL(c.req.url).searchParams
    if (
      [...query.keys()].some(
        (key) =>
          !['commit', 'cursor', 'limit'].includes(key) ||
          query.getAll(key).length !== 1,
      )
    )
      return resultResponse(invalid('Invalid CI page query'))
    const cursor = query.get('cursor') ?? '0',
      limit = query.get('limit') ?? '8',
      commit = query.get('commit') ?? undefined
    if (
      !/^\d{1,3}$/.test(cursor) ||
      !/^\d{1,2}$/.test(limit) ||
      (commit !== undefined && !commitId(commit).ok)
    )
      return resultResponse(invalid('Invalid CI page'))
    return resultResponse(
      engine.list(
        { repositoryId, actor: c.get('actor') },
        Number(cursor),
        Number(limit),
        commit,
      ),
    )
  })
  app.get(`${base}/jobs/:job/receipt`, (c) => {
    const id = c.req.param('job')
    return resultResponse(
      /^ci_[a-f0-9]{64}$/.test(id)
        ? engine.receipt({ repositoryId, actor: c.get('actor') }, id)
        : invalid('Invalid CI job ID'),
    )
  })
  app.get(`${base}/jobs/:job`, (c) => {
    const id = c.req.param('job')
    return resultResponse(
      /^ci_[a-f0-9]{64}$/.test(id)
        ? engine.status({ repositoryId, actor: c.get('actor') }, id)
        : invalid('Invalid CI job ID'),
    )
  })
  app.post(`${base}/jobs/:job/cancel`, (c) => {
    const id = c.req.param('job')
    if (c.req.raw.body !== null)
      return resultResponse(invalid('Cancellation accepts no body'))
    return resultResponse(
      /^ci_[a-f0-9]{64}$/.test(id)
        ? engine.cancel({ repositoryId, actor: c.get('actor') }, id)
        : invalid('Invalid CI job ID'),
    )
  })
}
