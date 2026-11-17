import type { Hono } from 'hono'
import {
  AgentToolError,
  readBoundedBodyText,
  registerAgentToolTransports,
} from 'deepspace/worker'
import { authenticateTool } from './agent-auth'
import type { AuthEnvironment } from './auth'
import { routeRepository } from '../storage/routing'
import { resultResponse } from '../api/result'
import { objectValue } from '../../domain/validation'
import { invalid } from '../../domain/result'
import type { Result } from '../../domain/result'
import type { RepositoryHead } from '../../domain/repository'
import {
  REPOSITORY_HEAD_TOOL,
  TOOL_REQUEST_BYTES,
  TOOL_RESULT_BYTES,
  validateHead,
} from '../../features/agent-tools/contracts'
import {
  repositoryHead,
  unavailable,
} from '../../features/agent-tools/repository-head'
import {
  headInputSchema,
  headOutputSchema,
} from '../../features/agent-tools/schemas'

interface ToolEnvironment extends AuthEnvironment {
  readonly REPOSITORY_ROOMS: DurableObjectNamespace
  readonly APP_NAME: string
  readonly DEEPSPACE_APP_ID: string
}
/** Forward only the verified bearer to the existing owner HTTP/application seam. */
async function readOwnerHead(
  env: ToolEnvironment,
  request: Request,
  id: string,
): Promise<Result<RepositoryHead>> {
  try {
    const owner = routeRepository(env.REPOSITORY_ROOMS, id)
    if (!owner.ok) return owner
    const url = new URL(
      `/_deepspace/agent/repositories/${id}/head`,
      request.url,
    )
    const response = await owner.value.fetch(
      new Request(url, {
        method: 'GET',
        signal: request.signal,
        headers: { authorization: request.headers.get('authorization') ?? '' },
      }),
    )
    if (!response.ok) {
      await response.body?.cancel()
      if (
        response.status === 401 ||
        response.status === 403 ||
        response.status === 404
      )
        return {
          ok: false,
          error: {
            code:
              response.status === 401
                ? 'UNAUTHENTICATED'
                : response.status === 403
                  ? 'FORBIDDEN'
                  : 'NOT_FOUND',
            message:
              response.status === 401
                ? 'Valid bearer identity required'
                : response.status === 403
                  ? 'Repository access denied'
                  : 'Repository not found',
          },
        }
      return unavailable()
    }
    const value: unknown = JSON.parse(
      await readBoundedBodyText(response, TOOL_RESULT_BYTES),
    )
    if (!objectValue(value) || value.ok !== true) return unavailable()
    const head = validateHead(value.value)
    return head.ok ? head : unavailable()
  } catch {
    return unavailable()
  }
}
export function registerRepositoryTools<E extends ToolEnvironment>(
  app: Hono<{ Bindings: E }>,
) {
  app.use('/_deepspace/agent/*', async (c, next) => {
    if (c.req.url.length > 2048 || new URL(c.req.url).search)
      return resultResponse(
        invalid('Tool URL exceeds limits or has query parameters'),
      )
    await next()
  })
  registerAgentToolTransports(app, {
    basePath: '/_deepspace/agent',
    requestBodyCap: TOOL_REQUEST_BYTES,
    resultCap: TOOL_RESULT_BYTES,
    describe: (env) => ({ id: env.DEEPSPACE_APP_ID, name: env.APP_NAME }),
    resolveTools: async (request, env) => {
      const identity = await authenticateTool(request, env)
      if (!identity.ok) return resultResponse(identity)
      return {
        [REPOSITORY_HEAD_TOOL]: {
          description:
            'Read the current HEAD of a private MiniAgentGit repository you own. Does not mutate commits or CI.',
          inputSchema: headInputSchema,
          outputSchema: headOutputSchema,
          execute: async (input: unknown) => {
            const result = await repositoryHead(input, (id) =>
              readOwnerHead(env, request, id),
            )
            if (!result.ok)
              throw new AgentToolError(
                result.error.code,
                'message' in result.error
                  ? result.error.message
                  : 'Tool unavailable',
                result.error.code === 'INVALID_INPUT'
                  ? 400
                  : result.error.code === 'UNAUTHENTICATED'
                    ? 401
                    : result.error.code === 'FORBIDDEN'
                      ? 403
                      : result.error.code === 'NOT_FOUND'
                        ? 404
                        : 503,
              )
            return result.value
          },
        },
      }
    },
  })
}
