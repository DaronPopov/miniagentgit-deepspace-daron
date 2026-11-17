/** DeepSpace framework wiring only; no repository mutation endpoints. */
import {
  CanvasRoom,
  CronRoom,
  PresenceRoom,
  RecordRoom,
  YjsRoom,
} from 'deepspace/worker'
import type { DOManifest } from 'deepspace/worker'
export { RepositoryRoom } from './src/server/deepspace/repository-room'

import { schemas } from './src/schemas'
import { createApp, type Env } from './src/server/app'

export const __DO_MANIFEST__ = [
  { binding: 'REPOSITORY_ROOMS', className: 'RepositoryRoom', sqlite: true },
  { binding: 'RECORD_ROOMS', className: 'AppRecordRoom', sqlite: true },
  { binding: 'YJS_ROOMS', className: 'AppYjsRoom', sqlite: true },
  { binding: 'CANVAS_ROOMS', className: 'AppCanvasRoom', sqlite: true },
  { binding: 'PRESENCE_ROOMS', className: 'AppPresenceRoom', sqlite: true },
  { binding: 'CRON_ROOMS', className: 'AppCronRoom', sqlite: true },
  { binding: 'JOB_ROOMS', className: 'AppJobRoom', sqlite: true },
] as const satisfies DOManifest

// These subclasses are required by the scaffold's Durable Object manifest.
// No room routes are mounted in this foundation pass.
export class AppRecordRoom extends RecordRoom<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env, schemas, { ownerUserId: env.OWNER_USER_ID })
  }
}
export class AppYjsRoom extends YjsRoom<Env> {}
export class AppCanvasRoom extends CanvasRoom<Env> {}
export class AppPresenceRoom extends PresenceRoom<Env> {}
export class AppCronRoom extends CronRoom<Env> {
  protected async onTask(): Promise<void> {
    throw new Error('No scheduled tasks configured')
  }
}
export { AppJobRoom } from './src/server/deepspace/ci-job-room'

export default createApp()
