import { enqueueCi } from './ci-enqueue'
import { validDispatch } from '../../application/ci/stages'
import {
  reconcileStageDeadlines,
  reserveDispatch,
} from '../storage/ci/dispatch'
import { runStage } from '../storage/ci/stages'
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
import { createAgentOwnerRoutes } from './agent-owner'
import { createOwnerRoutes } from '../api/repository-owner'
import { resultResponse } from '../api/result'

interface RepositoryEnvironment extends AuthEnvironment {
  readonly DEEPSPACE_APP_ID: string
  readonly JOB_ROOMS?: DurableObjectNamespace
  readonly REPOSITORY_ROOMS: DurableObjectNamespace
}
/** Exactly one scheduler/service pair per verified canonical owner instance. */
export class RepositoryRoom extends DurableObject<RepositoryEnvironment> {
  private owner: ReturnType<typeof createOwnerRoutes> | undefined
  private agentOwner: ReturnType<typeof createAgentOwnerRoutes> | undefined
  constructor(state: DurableObjectState, env: RepositoryEnvironment) {
    super(state, env)
    initializeDatabase(durableDatabase(state.storage))
  }
  async alarm() {
    const deadline = reconcileStageDeadlines(
      durableDatabase(this.ctx.storage),
      Date.now(),
    )
    if (deadline !== undefined) await this.ctx.storage.setAlarm(deadline)
  }

  async executeCiStage(dispatch: unknown) {
    if (
      !this.env.JOB_ROOMS ||
      !this.env.DEEPSPACE_APP_ID ||
      !validDispatch(dispatch)
    )
      return 'stale'
    const name = repositoryOwnerName(dispatch.repositoryId)
    if (
      !name.ok ||
      !this.ctx.id.equals(this.env.REPOSITORY_ROOMS.idFromName(name.value))
    )
      return 'stale'
    return runStage(durableDatabase(this.ctx.storage), dispatch)
  }

  async fetch(request: Request): Promise<Response> {
    const pathname = new URL(request.url).pathname
    const agent = pathname.match(
      /^\/_deepspace\/agent\/repositories\/(repo_[a-z0-9]{16,32})\/head$/,
    )
    const id =
      agent?.[1] ??
      pathname.match(
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
      const jobs = this.env.JOB_ROOMS
      const ci = createCiEngine({
        dispatch:
          jobs &&
          (async (job) => {
            const dispatch = reserveDispatch(
              durableDatabase(this.ctx.storage),
              job.id,
              Date.now(),
            )
            if (!dispatch) return
            try {
              await this.alarm()
              await enqueueCi(jobs, dispatch)
            } catch {
              // The reserved dispatch remains discoverable for authorized replay.
            }
          }),
        limits,
        store: createCiStore(
          durableDatabase(this.ctx.storage),
          id,
          limits,
          Date.now,
          jobs !== undefined,
        ),
        retain: (promise) => this.ctx.waitUntil(promise),
      })
      this.owner = createOwnerRoutes(id, runtime.service, this.env, ci)
      this.agentOwner = createAgentOwnerRoutes(id, runtime.service, this.env)
    }
    return agent && this.agentOwner
      ? this.agentOwner.fetch(request)
      : this.owner.fetch(request)
  }
}
