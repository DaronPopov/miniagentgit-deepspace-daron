import { verifyJwt } from 'deepspace/worker'
import type { Principal } from '../../domain/repository'
import type { Result } from '../../domain/result'

export interface AuthEnvironment {
  readonly AUTH_JWT_PUBLIC_KEY?: string
  readonly AUTH_JWT_ISSUER?: string
  readonly AUTH_JWT_AUDIENCE?: string
}

export async function authenticate(
  request: Request,
  env: AuthEnvironment,
): Promise<Result<Principal>> {
  const authorization = request.headers.get('authorization')
  const match = authorization?.match(/^Bearer ([^\s]+)$/i)
  const token = match?.[1]
  if (!token || token.length > 8192) return denied()
  if (
    !env.AUTH_JWT_PUBLIC_KEY ||
    !env.AUTH_JWT_ISSUER ||
    !env.AUTH_JWT_AUDIENCE
  ) {
    return {
      ok: false,
      error: {
        code: 'UNAVAILABLE',
        message: 'Identity verification not configured',
      },
    }
  }
  const { result } = await verifyJwt(
    {
      publicKey: env.AUTH_JWT_PUBLIC_KEY,
      issuer: env.AUTH_JWT_ISSUER,
      audience: env.AUTH_JWT_AUDIENCE,
    },
    token,
  )
  if (
    !result ||
    !result.userId ||
    result.userId.startsWith('anon-') ||
    typeof result.claims.exp !== 'number' ||
    result.claims.exp * 1000 <= Date.now()
  )
    return denied()
  return { ok: true, value: { kind: 'user', subject: result.userId } }
}

function denied(): Result<never> {
  return {
    ok: false,
    error: {
      code: 'UNAUTHENTICATED',
      message: 'Valid bearer identity required',
    },
  }
}
