import { admitOwner, approve } from '../admission/control'
import type { Hono } from 'hono'
import { registerAgentToolTransports } from 'deepspace/worker'
import { CI_DEFAULT_LIMITS } from '../../application/ci/limits'
import { invalid } from '../../domain/result'
import {
  REPOSITORY_HEAD_TOOL,
  TOOL_REQUEST_BYTES,
  TOOL_RESULT_BYTES,
  validateHead,
} from '../../features/agent-tools/contracts'
import { schemaAdapter } from '../../features/agent-tools/json-schema'
import {
  AGENT_BASE,
  operations,
  ownerOperation,
} from '../../features/agent-tools/operation-inputs'
import {
  projectOutput,
  resultBytes,
  validOutput,
} from '../../features/agent-tools/operation-output'
import {
  operationInputs,
  operationOutputs,
} from '../../features/agent-tools/operation-schemas'
import {
  repositoryHead,
  unavailable,
} from '../../features/agent-tools/repository-head'
import {
  headInputSchema,
  headOutputSchema,
} from '../../features/agent-tools/schemas'
import { checkedUtf8Body } from '../api/request'
import { resultResponse } from '../api/result'
import { authenticateTool } from './agent-auth'
import { callOwner } from './agent-binding'
import { toolFailure } from './agent-errors'
import type { AuthEnvironment } from './auth'

interface ToolEnvironment extends AuthEnvironment {
  readonly MINIGIT_TRUSTED_SUBJECTS?: string
  readonly REPOSITORY_ROOMS: DurableObjectNamespace
  readonly APP_NAME: string
  readonly DEEPSPACE_APP_ID: string
}

const descriptions = {
  repository_create:
    'Create a private repository for your account using an idempotency key.',
  repository_commit:
    'Commit bounded text changes to your repository using expected HEAD and an idempotency key.',
  ci_request:
    'Request fixed static CI for an immutable commit you own. Returns admission status.',
  ci_status: 'Read persisted CI status for a job in your repository.',
  ci_receipt:
    'Read the immutable terminal CI receipt for a job in your repository.',
} as const

export function registerRepositoryTools<E extends ToolEnvironment>(
  app: Hono<{ Bindings: E }>,
  enforceAdmission = false,
) {
  app.use(AGENT_BASE + '/*', async (c, next) => {
    if (c.req.url.length > 2048 || c.req.url.includes('?'))
      return resultResponse(
        invalid('Tool URL exceeds limits or has query parameters'),
      )
    if (c.req.method === 'POST' && c.req.raw.body) {
      const init = {
        body: checkedUtf8Body(c.req.raw, TOOL_REQUEST_BYTES),
        duplex: 'half' as const,
        signal: c.req.raw.signal,
      }
      c.req.raw = new Request(c.req.raw, init)
    }
    await next()
  })
  registerAgentToolTransports(app, {
    basePath: AGENT_BASE,
    requestBodyCap: TOOL_REQUEST_BYTES,
    resultCap: CI_DEFAULT_LIMITS.receiptBytes,
    describe: (env) => ({ id: env.DEEPSPACE_APP_ID, name: env.APP_NAME }),
    resolveTools: async (request, env) => {
      const identity = await authenticateTool(request, env)
      if (!identity.ok) return resultResponse(identity)
      if (enforceAdmission) {
        const approved = approve(env.MINIGIT_TRUSTED_SUBJECTS, identity.value)
        if (!approved.ok) return resultResponse(approved)
      }
      return {
        [REPOSITORY_HEAD_TOOL]: {
          description:
            'Read the current HEAD of a private MiniAgentGit repository you own. Does not mutate commits or CI.',
          inputSchema: headInputSchema,
          outputSchema: headOutputSchema,
          execute: async (input: unknown) => {
            const result = await repositoryHead(input, async (id) => {
              if (enforceAdmission) {
                const admitted = await admitOwner(env, id, false, false)
                if (!admitted.ok) return admitted
              }
              const response = await callOwner(
                env.REPOSITORY_ROOMS,
                request,
                { id, suffix: '/head', method: 'GET' },
                TOOL_RESULT_BYTES,
              )
              if (!response.ok) return response
              const head = validateHead(response.value)
              return head.ok ? head : unavailable()
            })
            return result.ok ? result.value : toolFailure(result.error)
          },
        },
        ...Object.fromEntries(
          operations.map((operation) => [
            'miniagentgit.' + operation,
            {
              description: descriptions[operation],
              inputSchema: schemaAdapter(operationInputs[operation]),
              outputSchema: schemaAdapter(
                operationOutputs[operation],
                (value) => validOutput(operation, value),
              ),
              execute: async (input: unknown) => {
                const route = await ownerOperation(
                  operation,
                  input,
                  identity.value,
                )
                if (!route.ok) return toolFailure(route.error)
                if (enforceAdmission) {
                  const admitted = await admitOwner(
                    env,
                    route.value.id,
                    operation === 'repository_create',
                    operation === 'ci_request',
                  )
                  if (!admitted.ok) return toolFailure(admitted.error)
                }
                const response = await callOwner(
                  env.REPOSITORY_ROOMS,
                  request,
                  route.value,
                  // Private response includes the envelope and, for writes, the
                  // signed account subject before projection.
                  resultBytes[operation] + 256,
                )
                if (!response.ok) return toolFailure(response.error)
                const value = projectOutput(operation, response.value)
                if (!validOutput(operation, value)) {
                  return toolFailure({
                    code: 'UNAVAILABLE',
                    message: 'Invalid repository operation result',
                  })
                }
                // Source is never returned; suppress any exact bearer echoed in metadata.
                const token = request.headers.get('authorization')?.slice(7)
                if (token && JSON.stringify(value).includes(token))
                  return toolFailure({
                    code: 'UNAVAILABLE',
                    message: 'Invalid repository operation result',
                  })
                return value
              },
            },
          ]),
        ),
      }
    },
  })
}
