import { expect, it } from 'vitest'
import { agentCredentialFixture } from './agent-credential-fixture'
import { REPOSITORY_HEAD_TOOL } from '../src/features/agent-tools/contracts'

it('binds scoped Alice/Bob/Charlie identities to persisted owners and preserves every durable row', async () => {
  const f = await agentCredentialFixture()
  try {
    const a = await f.create('Alice'),
      b = await f.create('Bob')
    const alice = await f.token(),
      bob = await f.token('Bob'),
      charlie = await f.token('Charlie')
    expect(await (await f.head(alice, a.id)).json()).toEqual({
      ok: true,
      result: { repositoryId: a.id, commitId: null, version: 0 },
    })
    expect((await f.head(bob, b.id)).status).toBe(200)
    for (const token of [bob, charlie]) {
      const response = await f.head(token, a.id)
      expect(response.status).toBe(403)
      expect(await response.json()).toMatchObject({
        ok: false,
        code: 'FORBIDDEN',
      })
    }
    expect((await f.head(alice, 'repo_' + 'z'.repeat(32))).status).toBe(404)
    const commit = await f.commit('Alice', a.base, 'scoped_commit_key_1')
    await f.ci('Alice', a.base, String(commit.id))
    const storage = await f.storage(`repo:${a.id}`)
    const tables = await storage.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    const snapshot = () =>
      Promise.all(
        tables.map((row) => {
          if (typeof row.name !== 'string' || !/^[a-z_]+$/.test(row.name))
            throw new Error('Invalid fixture table')
          return storage.exec(`SELECT * FROM ${row.name} ORDER BY 1`)
        }),
      )
    const before = await snapshot()
    for (let n = 0; n < 2; n++) {
      // Reusable bearer read replay is allowed until expiry.
      expect(await (await f.head(alice, a.id)).json()).toEqual({
        ok: true,
        result: { repositoryId: a.id, commitId: commit.id, version: 1 },
      })
    }
    for (const token of [bob, charlie])
      expect((await f.head(token, a.id)).status).toBe(403)
    expect(await snapshot()).toEqual(before)
    await f.restart()
    expect((await f.head(alice, a.id)).status).toBe(200)
    expect((await f.head(bob, a.id)).status).toBe(403)
  } finally {
    await f.close()
  }
}, 30000)

it('reverifies bearer, canonical room and read-only path at the binding boundary', async () => {
  const f = await agentCredentialFixture()
  try {
    const a = await f.create('Alice'),
      alice = await f.token(),
      bob = await f.token('Bob')
    const namespace = await f.namespace()
    const room = namespace.get(namespace.idFromName(`repo:${a.id}`))
    const path = `/_deepspace/agent/repositories/${a.id}/head`
    for (const [token, status] of [
      [alice, 200],
      [bob, 403],
      ['forged', 401],
    ] as const) {
      const response = await room.fetch(`http://localhost${path}`, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      })
      expect(response.status).toBe(status)
    }
    expect(
      (
        await room.fetch(`http://localhost${path}`, {
          headers: { authorization: `Bearer ${alice}`, 'x-user-id': 'Alice' },
        })
      ).status,
    ).toBe(400)
    // Verify the forwarded bearer against the original origin.
    const wrongOrigin = await f.token('Alice', { aud: 'https://other.test' })
    expect(
      (
        await room.fetch(`http://localhost${path}`, {
          headers: {
            authorization: `Bearer ${wrongOrigin}`,
          },
        })
      ).status,
    ).toBe(401)
    expect(
      (
        await room.fetch(`http://localhost${path}?owner=Alice`, {
          headers: { authorization: `Bearer ${alice}` },
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await room.fetch(`http://localhost${path}`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${alice}`,
          },
        })
      ).status,
    ).toBe(404)
    expect(
      (
        await room.fetch(`http://localhost${a.base}/head`, {
          headers: {
            authorization: `Bearer ${alice}`,
          },
        })
      ).status,
    ).toBe(401)
    expect(
      (
        await room.fetch(`http://localhost${path}`, {
          method: 'HEAD',
          headers: {
            authorization: `Bearer ${alice}`,
          },
        })
      ).status,
    ).toBe(404)
    const wrongRoom = namespace.get(namespace.idFromName('wrong-owner'))
    expect(
      (
        await wrongRoom.fetch(`http://localhost${path}`, {
          headers: {
            authorization: `Bearer ${alice}`,
          },
        })
      ).status,
    ).toBe(400)
    expect((await f.send(alice, path)).status).toBe(404)
    expect(
      (
        await f.send(alice, `/_deepspace/agent/tools/${REPOSITORY_HEAD_TOOL}`, {
          input: { repositoryId: a.id, owner: 'Alice' },
        })
      ).status,
    ).toBe(400)
  } finally {
    await f.close()
  }
}, 30000)
