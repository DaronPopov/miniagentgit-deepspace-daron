import type { Principal } from '../../domain/repository'
import type { Result } from '../../domain/result'
import { success } from '../../domain/result'
import type { Database } from '../storage/database'
import {
  acquireProtected,
  admissionRoom,
  limits,
  releaseProtected,
  reserveRoute,
  spendWindow,
} from './ledger'
import type { WindowLane } from './ledger'

export interface AdmissionEnvironment {
  readonly MINIGIT_TRUSTED_SUBJECTS?: string
  readonly REPOSITORY_ROOMS: DurableObjectNamespace
}

export function trustedSubjects(raw: unknown): readonly string[] | undefined {
  if (typeof raw !== 'string' || raw.length > 4096) return
  const subjects = raw.split(',')
  if (
    subjects.length > 16 ||
    subjects.some(
      (subject) =>
        !/^[a-zA-Z0-9_.:@+|/-]{1,256}$/.test(subject) ||
        subject.startsWith('anon-'),
    ) ||
    new Set(subjects).size !== subjects.length
  )
    return
  return subjects
}
const closed: Result<never> = {
  ok: false,
  error: { code: 'UNAVAILABLE', message: 'Application admission unavailable' },
}
export function approve(raw: unknown, identity: Principal): Result<Principal> {
  const subjects = trustedSubjects(raw)
  if (!subjects) return closed
  return subjects.includes(identity.subject)
    ? success(identity)
    : {
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Account is not approved for this application',
        },
      }
}

export function admissionLane(
  path: string,
): 'auth' | 'token' | 'protected' | undefined {
  if (path === '/api/auth/token') return 'token'
  if (path === '/api/auth' || path.startsWith('/api/auth/')) return 'auth'
  if (
    path === '/api/me' ||
    path === '/api/repositories' ||
    path.startsWith('/api/repositories/') ||
    path === '/_deepspace/agent' ||
    path.startsWith('/_deepspace/agent/')
  )
    return 'protected'
}

export function controlRequest(
  db: Database,
  request: Request,
  now: number,
): Response {
  const url = new URL(request.url)
  if (
    request.method !== 'POST' ||
    url.origin !== 'https://miniagentgit-admission.invalid' ||
    request.url.length > 160 ||
    url.search ||
    url.hash
  )
    return new Response(null, { status: 404 })
  const lane = url.pathname.slice(1)
  if (lane === 'auth' || lane === 'token' || lane === 'ci')
    return new Response(null, {
      status: spendWindow(db, lane, now) ? 204 : 429,
    })
  const lease = /^\/(acquire|release)\/([a-f0-9-]{36})$/.exec(url.pathname)
  if (lease?.[2]) {
    if (lease[1] === 'release') {
      releaseProtected(db, lease[2])
      return new Response(null, { status: 204 })
    }
    const result = acquireProtected(db, lease[2], now)
    return decisionResponse(result)
  }
  const match = /^\/(route|create)\/(repo_[a-z0-9]{16,32})$/.exec(url.pathname)
  const id = match?.[2]
  if (!id) return new Response(null, { status: 404 })
  return decisionResponse(reserveRoute(db, id, match[1] === 'create'))
}

function decisionResponse(result: 'accepted' | keyof typeof limits) {
  return result === 'accepted'
    ? new Response(null, { status: 204 })
    : new Response(null, {
        status: 429,
        headers: { 'admission-limit': result },
      })
}

async function decide(
  env: Partial<AdmissionEnvironment>,
  path: string,
  resource: keyof typeof limits,
): Promise<Result<null>> {
  if (!env.REPOSITORY_ROOMS || !trustedSubjects(env.MINIGIT_TRUSTED_SUBJECTS))
    return closed
  try {
    const room = env.REPOSITORY_ROOMS.get(
      env.REPOSITORY_ROOMS.idFromName(admissionRoom),
    )
    const response = await room.fetch(
      'https://miniagentgit-admission.invalid/' + path,
      { method: 'POST' },
    )
    if (response.status === 204) return success(null)
    if (response.status === 429) {
      const limit = response.headers.get('admission-limit')
      const cap =
        limit === 'routes' || limit === 'concurrency' || limit === 'protected'
          ? limit
          : resource
      return {
        ok: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          resource: 'admission:' + cap,
          maximum: limits[cap],
        },
      }
    }
  } catch {
    // Binding and storage errors fail closed without platform error text.
  }
  return closed
}
export const admitRequest = (
  env: Partial<AdmissionEnvironment>,
  lane: Exclude<WindowLane, 'protected'>,
) => decide(env, lane, lane)
export async function admitOwner(
  env: Partial<AdmissionEnvironment>,
  id: string,
  creation: boolean,
  ci: boolean,
) {
  const route = await decide(
    env,
    (creation ? 'create/' : 'route/') + id,
    creation ? 'repositories' : 'routes',
  )
  return route.ok && ci ? admitRequest(env, 'ci') : route
}

export async function withProtectedAdmission(
  env: AdmissionEnvironment,
  next: () => Promise<void>,
  retain: (release: Promise<unknown>) => void,
) {
  const lease = crypto.randomUUID()
  const admitted = await decide(env, 'acquire/' + lease, 'protected')
  if (!admitted.ok) return admitted
  try {
    await next()
    return admitted
  } finally {
    // Lost work or release fails closed. Never recycle a slot by age alone.
    retain(decide(env, 'release/' + lease, 'protected'))
  }
}
