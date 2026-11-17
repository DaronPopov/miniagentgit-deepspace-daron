import { DurableObject } from 'cloudflare:workers'
import { REPOSITORY_SCHEMA } from '../storage/schema'

/** Lifecycle wiring only. No commit implementation or externally mounted route. */
export class RepositoryRoom extends DurableObject<unknown> {
  constructor(state: DurableObjectState, env: unknown) {
    super(state, env)
    state.storage.transactionSync(() => {
      for (const sql of REPOSITORY_SCHEMA) state.storage.sql.exec(sql)
    })
  }

  async fetch(): Promise<Response> {
    return Response.json(
      {
        error: {
          code: 'UNAVAILABLE',
          message: 'Repository operations not implemented',
        },
      },
      { status: 501 },
    )
  }
}
