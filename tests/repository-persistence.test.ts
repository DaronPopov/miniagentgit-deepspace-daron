import { expect, it } from 'vitest'
import { canonicalManifest, sha256 } from '../src/domain/commit-hashing'
import { prepareCommit } from '../src/application/prepare-commit'
import { fixture, request, unwrap, actor, creation } from './sqlite-fixture'

it('creates no fictional commit, replays creation, rejects conflicting creation and isolates ownership', async () => {
  const f = await fixture()
  try {
    const metadata = unwrap(await f.initialize())
    expect(unwrap(await f.authority.initialize(actor, creation))).toEqual(
      metadata,
    )
    expect(
      await f.authority.initialize(actor, { ...creation, name: 'changed' }),
    ).toMatchObject({ error: { code: 'CONFLICT' } })
    expect(unwrap(await f.authority.readHead(f.context))).toEqual({
      commitId: null,
      version: 0,
    })
    expect(f.db.all('SELECT * FROM commits')).toHaveLength(0)
    const other = {
      ...f.context,
      actor: { kind: 'user' as const, subject: 'other' },
    }
    expect(await f.authority.readRepository(other)).toMatchObject({
      error: { code: 'FORBIDDEN' },
    })
    expect(await f.authority.createCommit(other, request())).toMatchObject({
      error: { code: 'FORBIDDEN' },
    })
    expect(
      await f.authority.readRepository({
        ...f.context,
        repositoryId: 'repo_1234567890123456',
      }),
    ).toMatchObject({ error: { code: 'INVALID_INPUT' } })
  } finally {
    f.close()
  }
})
it('persists sequential full snapshots, deletion, immutable old files and metadata', async () => {
  const f = await fixture()
  try {
    unwrap(await f.initialize())
    const first = unwrap(
      await f.runtime.service.createCommit(f.context, request()),
    )
    const second = unwrap(
      await f.runtime.service.createCommit(f.context, {
        ...request('commit_request_key_2', first.id, 'second'),
        changes: [
          { kind: 'put', path: 'b.txt', text: 'second' },
          { kind: 'delete', path: 'src/a.txt' },
        ],
      }),
    )
    expect(second.parentId).toBe(first.id)
    expect(unwrap(await f.authority.readHead(f.context))).toEqual({
      commitId: second.id,
      version: 2,
    })
    expect(
      unwrap(await f.authority.readFile(f.context, first.id, 'src/a.txt')),
    ).toBe('hello')
    expect(
      await f.authority.readFile(f.context, second.id, 'src/a.txt'),
    ).toMatchObject({ error: { code: 'NOT_FOUND' } })
    expect(unwrap(await f.authority.readCommit(f.context, first.id))).toEqual(
      first,
    )
    const tree = unwrap(
      await f.authority.listTree(f.context, second.id, {
        cursor: null,
        limit: 25,
      }),
    )
    expect(tree.items.map((file) => file.path)).toEqual(['b.txt'])
    expect(
      f.db.all(
        'SELECT manifest_hash FROM snapshots WHERE commit_id=?',
        second.id,
      )[0]?.manifest_hash,
    ).toBe(await sha256(canonicalManifest(tree.items)))
    for (const table of [
      'commits',
      'file_contents',
      'manifest_entries',
      'idempotency',
      'snapshots',
    ]) {
      expect(() => f.db.run(`DELETE FROM ${table}`)).toThrow('immutable')
    }
  } finally {
    f.close()
  }
})
it('uses known SHA-256 and canonical hashes independent of change order', async () => {
  expect(await sha256('hello')).toBe(
    '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
  )
  const f = await fixture()
  try {
    const input = {
      ...request(),
      changes: [
        { kind: 'put' as const, path: 'b', text: 'B' },
        { kind: 'put' as const, path: 'a', text: 'A' },
      ],
    }
    const a = await prepareCommit(f.id, actor, input, [], 'fixed timestamp')
    const b = await prepareCommit(
      f.id,
      actor,
      { ...input, changes: [...input.changes].reverse() },
      [],
      'fixed timestamp',
    )
    expect([a.metadata.id, a.manifestHash, a.requestDigest]).toEqual([
      b.metadata.id,
      b.manifestHash,
      b.requestDigest,
    ])
    expect(a.manifest.map((file) => file.path)).toEqual(['a', 'b'])
  } finally {
    f.close()
  }
})
