import { JobRoom } from 'deepspace/worker'
import type { Job, JobContext } from 'deepspace/worker'
import { stageBounds, validDispatch } from '../../application/ci/stages'
import { objectValue } from '../../domain/validation'
import { repositoryOwnerName } from '../../domain/ownership'
import type { RepositoryRoom } from './repository-room'

import { jobType } from './ci-enqueue'

interface JobEnvironment {
  readonly REPOSITORY_ROOMS: DurableObjectNamespace<RepositoryRoom>
  readonly JOB_ROOMS: DurableObjectNamespace
  readonly DEEPSPACE_APP_ID: string
}

export class AppJobRoom extends JobRoom<JobEnvironment> {
  constructor(state: DurableObjectState, env: JobEnvironment) {
    super(state, env, {
      authorizeRead: () => false,
      authorizeWrite: () => false,
    })
  }

  override async fetch(request: Request): Promise<Response> {
    if (
      request.method !== 'POST' ||
      new URL(request.url).pathname !== '/enqueue' ||
      request.headers.has('upgrade')
    )
      return new Response(null, { status: 404 })
    const body: unknown = await request
      .clone()
      .json()
      .catch(() => null)
    if (
      !objectValue(body) ||
      body.type !== jobType ||
      body.maxAttempts !== 1 ||
      body.enqueuedBy !== undefined ||
      !validDispatch(body.payload) ||
      !this.state.id.equals(this.env.JOB_ROOMS.idFromName(body.payload.ciJobId))
    )
      return new Response(null, { status: 400 })
    return super.fetch(request)
  }

  protected override async onJob(job: Job, ctx: JobContext): Promise<void> {
    if (
      job.type !== jobType ||
      !validDispatch(job.payload) ||
      !this.env.DEEPSPACE_APP_ID
    )
      throw new Error('Invalid CI dispatch')
    const name = repositoryOwnerName(job.payload.repositoryId)
    if (!name.ok || ctx.signal.aborted) return
    const namespace = this.env.REPOSITORY_ROOMS
    const owner = namespace.get(namespace.idFromName(name.value))
    const result = await owner.executeCiStage(job.payload)
    if (result === 'continue' && !ctx.signal.aborted && job.attempts === 1)
      ctx.continue(
        { next: 'source-policy' },
        { afterMs: stageBounds.continuationMs },
      )
  }
}
