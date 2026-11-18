import { AgentToolError, readBoundedBodyText } from 'deepspace/worker'
import { invalid } from '../../domain/result'
import type { DomainError, Result } from '../../domain/result'
import { commitId, objectValue } from '../../domain/validation'
import { resultResponse } from '../api/result'

const conflictMessages = new Set([
  'Expected HEAD does not match',
  'Idempotency key reused with different request',
  'Repository already exists with different creation request',
  'Creation identity mismatch',
  'CI receipt not ready',
])

async function readConflict(response: Response): Promise<Result<never>> {
  let message = 'Request conflicts with current state'
  let actualHead: string | null = null
  try {
    const body: unknown = JSON.parse(await readBoundedBodyText(response, 1024))
    if (objectValue(body) && objectValue(body.error)) {
      const error = body.error
      if (
        typeof error.message === 'string' &&
        conflictMessages.has(error.message)
      )
        message = error.message
      const head = commitId(error.actualHead)
      if (head.ok) actualHead = head.value
    }
  } catch {
    // Keep the fixed conflict response if the binding payload is invalid.
  }
  return { ok: false, error: { code: 'CONFLICT', message, actualHead } }
}

export async function ownerFailure(response: Response): Promise<Result<never>> {
  const status = response.status
  if (status === 409) return readConflict(response)
  await response.body?.cancel().catch(() => undefined)
  if (status === 400) return invalid('Invalid tool arguments')
  if (status === 413 || status === 429)
    throw new AgentToolError(
      'QUOTA_EXCEEDED',
      'Tool operation exceeds a resource limit',
      status,
    )
  const [code, message] =
    status === 401
      ? (['UNAUTHENTICATED', 'Valid bearer identity required'] as const)
      : status === 403
        ? (['FORBIDDEN', 'Repository access denied'] as const)
        : status === 404
          ? (['NOT_FOUND', 'Repository, commit or job not found'] as const)
          : (['UNAVAILABLE', 'Repository operation unavailable'] as const)
  return { ok: false, error: { code, message } }
}

export function toolFailure(error: DomainError): never {
  const message =
    'message' in error
      ? error.message
      : 'Tool operation exceeds a resource limit'
  throw new AgentToolError(
    error.code,
    error.code === 'CONFLICT' && error.actualHead
      ? message + '. Current HEAD: ' + error.actualHead
      : message,
    resultResponse({ ok: false, error }).status,
  )
}
