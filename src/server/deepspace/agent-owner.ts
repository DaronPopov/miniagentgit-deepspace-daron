import type { CiEngine } from '../../application/ci/service'
import type { RepositoryService } from '../../application/repository-service'
import { invalid } from '../../domain/result'
import { AGENT_REPOSITORIES } from '../../features/agent-tools/operation-inputs'
import { createOwnerRoutes } from '../api/repository-owner'
import { resultResponse } from '../api/result'
import { authenticateTool } from './agent-auth'
import type { AuthEnvironment } from './auth'

// HTTP framing that may be added by a local workerd binding proxy.
const framingHeaders = new Set([
  'accept',
  'accept-encoding',
  'accept-language',
  'connection',
  'content-length',
  'host',
  'sec-fetch-mode',
  'transfer-encoding',
  'user-agent',
])

/** Fixed binding-only surface over the same repository HTTP application adapter. */
export function createAgentOwnerRoutes(
  id: string,
  service: RepositoryService,
  env: AuthEnvironment,
  ci: CiEngine,
) {
  const base = AGENT_REPOSITORIES + '/' + id
  const owner = createOwnerRoutes(id, service, env, ci, {
    base: AGENT_REPOSITORIES,
    authenticate: authenticateTool,
  })
  return (request: Request): Promise<Response> | Response => {
    const url = new URL(request.url)
    if (!url.pathname.startsWith(base)) return missing()
    const path = url.pathname.slice(base.length)
    const { method } = request
    const permitted =
      (method === 'PUT' && path === '') ||
      (method === 'POST' &&
        (path === '/commits' || /^\/ci\/commits\/[a-f0-9]{64}$/.test(path))) ||
      (method === 'GET' &&
        (path === '/head' ||
          /^\/ci\/jobs\/ci_[a-f0-9]{64}(\/receipt)?$/.test(path)))
    if (!permitted) return missing()
    if (
      request.url.length > 2048 ||
      request.url.includes('?') ||
      [...request.headers.keys()].some(
        (name) =>
          !framingHeaders.has(name) &&
          name !== 'authorization' &&
          !(method !== 'GET' && name === 'content-type'),
      )
    )
      return resultResponse(invalid('Invalid agent owner request'))
    return owner.fetch(request)
  }
}

function missing() {
  return resultResponse({
    ok: false,
    error: { code: 'NOT_FOUND', message: 'Unknown agent owner endpoint' },
  })
}
