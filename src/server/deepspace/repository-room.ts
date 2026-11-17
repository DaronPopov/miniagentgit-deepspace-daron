import { DurableObject } from 'cloudflare:workers'
import type { AuthEnvironment } from './auth'
import { repositoryOwnerName } from '../../domain/ownership'
import { createCiEngine } from '../../application/ci/service'
import { ciLimits } from '../../application/ci/limits'
import { createCiStore } from '../storage/ci/store'
import { createRepositoryRuntime } from '../../application/repository-runtime'
import { createRepositoryAuthority } from '../storage/repository-authority'
import { initializeDatabase } from '../storage/migrations'
import { durableDatabase } from './database'
import { createOwnerRoutes } from '../api/repository-owner'
import { resultResponse } from '../api/result'

interface RepositoryEnvironment extends AuthEnvironment {
  readonly REPOSITORY_ROOMS: DurableObjectNamespace
}
/** Exactly one scheduler/service pair per verified canonical owner instance. */
export class RepositoryRoom extends DurableObject<RepositoryEnvironment> {
  private owner: ReturnType<typeof createOwnerRoutes> | undefined
  constructor(state: DurableObjectState, env: RepositoryEnvironment) {
    super(state, env)
    initializeDatabase(durableDatabase(state.storage))
  }
  async fetch(request: Request): Promise<Response> {
    const id = new URL(request.url).pathname.match(
      /^\/api\/repositories\/(repo_[a-z0-9]{16,32})(?:\/|$)/,
    )?.[1]
    const name = repositoryOwnerName(id)
    if (
      !name.ok ||
      !this.ctx.id.equals(this.env.REPOSITORY_ROOMS.idFromName(name.value))
    ) {
      return resultResponse({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Repository owner routing mismatch',
        },
      })
    }
    if (!id) throw new Error('Missing owner ID')
    if (!this.owner) {
      const authority = createRepositoryAuthority({
        id,
        db: durableDatabase(this.ctx.storage),
      })
      const runtime = createRepositoryRuntime({
        id,
        authority,
        retainExecution: (promise) => this.ctx.waitUntil(promise),
      })
      const limits = ciLimits()
      const ci = createCiEngine({
        limits,
        store: createCiStore(
          durableDatabase(this.ctx.storage),
          id,
          limits,
          Date.now,
        ),
        retain: (promise) => this.ctx.waitUntil(promise),
      })
      this.owner = createOwnerRoutes(id, runtime.service, this.env, ci)
    }
    return this.owner.fetch(request)
  }
}
