import { expect, it } from 'vitest'
import { fixture, nodeDatabase, request, unwrap } from './sqlite-fixture'
import { FREE_TIER_LIMITS } from '../src/application/resource-limits'
import { initializeDatabase } from '../src/server/storage/migrations'
import { REPOSITORY_SCHEMA } from '../src/server/storage/schema'

it('accepts exactly the logical-byte cap and rejects one byte less with no partial writes', async () => {
  const initial = await fixture()
  let bytes: number
  try {
    unwrap(await initial.initialize())
    unwrap(await initial.authority.createCommit(initial.context, request()))
    const measured = initial.db.all('SELECT logical_bytes FROM repository')[0]
      ?.logical_bytes
    if (typeof measured !== 'number') throw new Error('Expected byte counter')
    bytes = measured
  } finally {
    initial.close()
  }
  for (const limit of [bytes, bytes - 1]) {
    const f = await fixture({
      limits: { ...FREE_TIER_LIMITS, repositoryLogicalBytes: limit },
    })
    try {
      unwrap(await f.initialize())
      const result = await f.authority.createCommit(f.context, request())
      expect(result.ok).toBe(limit === bytes)
      expect(f.db.all('SELECT * FROM commits').length).toBe(
        limit === bytes ? 1 : 0,
      )
      if (!result.ok)
        expect(result.error).toMatchObject({
          code: 'QUOTA_EXCEEDED',
          resource: 'repositoryLogicalBytes',
        })
    } finally {
      f.close()
    }
  }
})
it('rejects file/directory collisions without advancing HEAD and reports expected quota rejection in diagnostics', async () => {
  const f = await fixture({
    limits: { ...FREE_TIER_LIMITS, filesPerRepository: 1 },
  })
  try {
    unwrap(await f.initialize())
    const collision = {
      ...request(),
      changes: [
        { kind: 'put' as const, path: 'a', text: 'one' },
        { kind: 'put' as const, path: 'a/b', text: 'two' },
      ],
    }
    expect(
      await f.runtime.service.createCommit(f.context, collision),
    ).toMatchObject({ error: { code: 'INVALID_INPUT' } })
    const quota = {
      ...request(),
      changes: [
        { kind: 'put' as const, path: 'a', text: 'one' },
        { kind: 'put' as const, path: 'b', text: 'two' },
      ],
    }
    expect(
      await f.runtime.service.createCommit(f.context, quota),
    ).toMatchObject({ error: { code: 'QUOTA_EXCEEDED' } })
    expect(f.runtime.scheduler.events().at(-1)).toMatchObject({
      kind: 'rejected',
      reason: 'quota',
    })
    expect(unwrap(await f.authority.readHead(f.context)).version).toBe(0)
    expect(f.runtime.retainedPayloads()).toBe(0)
  } finally {
    f.close()
  }
})
it('upgrades the old schema additively and leaves existing identity and empty HEAD intact', () => {
  const f = nodeDatabase(':memory:', false)
  try {
    for (const statement of REPOSITORY_SCHEMA) f.db.run(statement)
    f.db.run(
      "INSERT INTO repository VALUES (1,'repo_abcdefghijklmnop','existing','owner','old',0)",
    )
    f.db.run('INSERT INTO head VALUES (1,NULL,0)')
    initializeDatabase(f.db)
    initializeDatabase(f.db)
    expect(f.db.all('SELECT * FROM repository')[0]).toMatchObject({
      id: 'repo_abcdefghijklmnop',
      created_at: 'old',
    })
    expect(f.db.all('SELECT * FROM head')).toMatchObject([
      { commit_id: null, version: 0 },
    ])
    expect(f.db.all('SELECT * FROM commits')).toHaveLength(0)
    expect(f.db.all('SELECT * FROM repository_migrations')).toEqual([
      { version: 2 },
      { version: 3 },
      { version: 4 },
      { version: 5 },
    ])
  } finally {
    f.close()
  }
})
