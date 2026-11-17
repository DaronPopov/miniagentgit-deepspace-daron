import { expect, it } from 'vitest'
import { fixture, request, unwrap } from './sqlite-fixture'
import { FREE_TIER_LIMITS } from '../src/application/resource-limits'
import { prepareCommit } from '../src/application/prepare-commit'
import { persistCommit } from '../src/server/storage/commit-transaction'

it('allows exactly one competing expected-HEAD advance with real SQLite transactions', async () => {
  const f = await fixture()
  try {
    unwrap(await f.initialize())
    const outcomes = await Promise.all([
      f.runtime.service.createCommit(f.context, request()),
      f.runtime.service.createCommit(
        f.context,
        request('competing_commit_2', null, 'other'),
      ),
    ])
    expect(outcomes.filter((outcome) => outcome.ok)).toHaveLength(1)
    expect(outcomes.find((outcome) => !outcome.ok)).toMatchObject({
      error: { code: 'CONFLICT' },
    })
    expect(unwrap(await f.authority.readHead(f.context)).version).toBe(1)
    expect(f.db.all('SELECT * FROM commits')).toHaveLength(1)
    // Also prepare both from the same snapshot before either transaction executes.
    const head = unwrap(await f.authority.readHead(f.context)).commitId
    const tree = unwrap(
      await f.authority.listTree(f.context, head, { cursor: null, limit: 25 }),
    ).items
    const prepared = await Promise.all(
      ['prepared_commit_1', 'prepared_commit_2'].map((key) =>
        prepareCommit(
          f.id,
          f.context.actor,
          request(key, head, key),
          tree,
          'fixed',
        ),
      ),
    )
    expect(
      prepared
        .map((commit) =>
          persistCommit(f.db, f.id, f.context.actor, commit, FREE_TIER_LIMITS),
        )
        .filter((outcome) => outcome.ok),
    ).toHaveLength(1)
    expect(unwrap(await f.authority.readHead(f.context)).version).toBe(2)
  } finally {
    f.close()
  }
})
it('checks durable idempotency before stale HEAD and rejects key reuse with different semantics', async () => {
  const f = await fixture()
  try {
    unwrap(await f.initialize())
    const first = unwrap(await f.authority.createCommit(f.context, request()))
    expect(
      unwrap(await f.authority.createCommit(f.context, request())),
    ).toEqual(first)
    expect(
      await f.authority.createCommit(
        f.context,
        request('commit_request_key_1', null, 'different'),
      ),
    ).toMatchObject({ error: { code: 'CONFLICT' } })
    expect(
      await f.authority.createCommit(f.context, request('different_stale_key')),
    ).toMatchObject({ error: { code: 'CONFLICT', actualHead: first.id } })
    expect(
      unwrap(await f.authority.replay(f.context, 'commit_request_key_1')),
    ).toEqual(first)
    expect(f.db.all('SELECT * FROM commits')).toHaveLength(1)
  } finally {
    f.close()
  }
})
it('rolls back content, manifest, metadata, receipt, counters and HEAD after an injected failure', async () => {
  let fail = true
  const f = await fixture({
    beforeHead: () => {
      if (fail) throw new Error('injected failure')
    },
  })
  try {
    unwrap(await f.initialize())
    const counter = f.db.all('SELECT logical_bytes FROM repository')
    await expect(
      f.authority.createCommit(f.context, request()),
    ).rejects.toThrow('injected failure')
    for (const table of [
      'commits',
      'file_contents',
      'manifest_entries',
      'snapshots',
      'idempotency',
    ])
      expect(f.db.all(`SELECT * FROM ${table}`)).toHaveLength(0)
    expect(f.db.all('SELECT logical_bytes FROM repository')).toEqual(counter)
    expect(unwrap(await f.authority.readHead(f.context))).toEqual({
      commitId: null,
      version: 0,
    })
    fail = false
    unwrap(await f.authority.createCommit(f.context, request()))
    expect(unwrap(await f.authority.readHead(f.context)).version).toBe(1)
  } finally {
    f.close()
  }
})
it('atomically enforces retained bytes, snapshot file count and durable commit count', async () => {
  for (const overrides of [
    { filesPerRepository: 1 },
    { commitsPerRepository: 1 },
    { repositoryLogicalBytes: 1600 },
  ]) {
    const f = await fixture({ limits: { ...FREE_TIER_LIMITS, ...overrides } })
    try {
      unwrap(await f.initialize())
      const input = {
        ...request(),
        changes: [
          { kind: 'put' as const, path: 'a', text: 'one' },
          { kind: 'put' as const, path: 'b', text: 'two' },
        ],
      }
      if ('commitsPerRepository' in overrides) {
        const first = unwrap(
          await f.authority.createCommit(f.context, request()),
        )
        expect(
          await f.authority.createCommit(
            f.context,
            request('second_commit_key', first.id),
          ),
        ).toMatchObject({
          error: { code: 'QUOTA_EXCEEDED', resource: 'commitsPerRepository' },
        })
      } else
        expect(await f.authority.createCommit(f.context, input)).toMatchObject({
          error: { code: 'QUOTA_EXCEEDED' },
        })
      expect(f.db.all('SELECT * FROM commits').length).toBe(
        'commitsPerRepository' in overrides ? 1 : 0,
      )
    } finally {
      f.close()
    }
  }
})
