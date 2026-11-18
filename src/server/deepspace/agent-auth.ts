import { verifyAgentToken } from 'deepspace/worker'
import { authenticate } from './auth'
import type { AuthEnvironment } from './auth'
import type { Principal } from '../../domain/repository'
import type { Result } from '../../domain/result'

/** Tool-only policy. Scope selects a credential kind, never repository access. */
export async function authenticateTool(
  request: Request,
  env: AuthEnvironment,
): Promise<Result<Principal>> {
  const user = await authenticate(request, env)
  if (user.ok)
    return user.value.subject.trim()
      ? user
      : {
          ok: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Valid bearer identity required',
          },
        }
  if (
    user.error.code !== 'UNAUTHENTICATED' ||
    !new URL(request.url).pathname.startsWith('/_deepspace/agent/')
  )
    return user
  const token = request.headers
    .get('authorization')
    ?.match(/^Bearer ([^\s]+)$/i)?.[1]
  if (!token || token.length > 8192) return user
  if (
    !env.AUTH_JWT_PUBLIC_KEY ||
    !env.AUTH_JWT_ISSUER ||
    !env.AUTH_JWT_AUDIENCE
  )
    return {
      ok: false,
      error: {
        code: 'UNAVAILABLE',
        message: 'Identity verification not configured',
      },
    }
  const origin = new URL(request.url).origin
  const { result } = await verifyAgentToken(
    {
      publicKey: env.AUTH_JWT_PUBLIC_KEY,
      issuer: env.AUTH_JWT_ISSUER,
      clockSkewMs: 0,
    },
    token,
    origin,
  )
  if (
    !result ||
    typeof result.userId !== 'string' ||
    !result.userId.trim() ||
    result.userId.startsWith('anon-') ||
    result.claims.scope !== 'agent' ||
    result.claims.aud !== origin ||
    typeof result.claims.exp !== 'number' ||
    !Number.isFinite(result.claims.exp) ||
    result.claims.exp * 1000 <= Date.now()
  )
    return user
  // VerifiedAuth.userId is the signed account sub, not a caller's owner claim.
  return { ok: true, value: { kind: 'user', subject: result.userId } }
}
