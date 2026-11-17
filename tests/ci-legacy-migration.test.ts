import { expect, it } from 'vitest'
import { ciFixture } from './ci-fixture'
import { request, unwrap } from './sqlite-fixture'
import { initializeDatabase } from '../src/server/storage/migrations'

it('interrupts unfinished version 2 jobs while preserving terminal version 2 receipts', async () => {
  const f = await ciFixture()
  try {
    f.db.run('DELETE FROM repository_migrations WHERE version=5')
    f.db.run('ALTER TABLE ci_stages DROP COLUMN ordinal')
    f.db.run('ALTER TABLE ci_stages DROP COLUMN stage_timings')
    const pipeline = { ...f.pipeline, version: 2 }
    const earlier = unwrap(await f.admit(f.commit.id, pipeline))
    unwrap(f.store.stop(f.context, earlier.id, 'cancelled'))
    const receipt = unwrap(f.store.receipt(f.context, earlier.id))
    const newer = unwrap(
      await f.authority.createCommit(
        f.context,
        request('ci_legacy_migration_commit', f.commit.id, 'second\n'),
      ),
    )
    const unfinished = unwrap(await f.admit(newer.id, pipeline))
    f.db.run('INSERT INTO ci_stages(job_id) VALUES (?)', unfinished.id)
    initializeDatabase(f.db)
    expect(unwrap(f.store.receipt(f.context, earlier.id))).toEqual(receipt)
    expect(unwrap(f.store.receipt(f.context, unfinished.id))).toMatchObject({
      schemaVersion: 1,
      pipeline: { version: 2 },
      terminalState: 'interrupted',
      code: 'pipeline_unavailable',
    })
  } finally {
    await f.dispose()
  }
})
