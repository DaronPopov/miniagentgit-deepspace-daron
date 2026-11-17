import { expect, it } from 'vitest'
import { tenantFixture } from './tenant-fixture'
import { stringColumn } from '../src/server/storage/database'
import { request } from './sqlite-fixture'

it('isolates Alice, Bob and Charlie across real workerd repository and CI APIs, including recreation', async () => {
  const f = await tenantFixture()
  try {
    const a = await f.create('Alice'),
      b = await f.create('Bob'),
      extra = await f.create('Alice', 'tenant_second_repo_key')
    expect(new Set([a.id, b.id, extra.id]).size).toBe(3)
    expect(a.metadata.ownerSubject).toBe('Alice')
    expect(b.metadata.ownerSubject).toBe('Bob')
    const [ac, bc] = await Promise.all([
      f.commit('Alice', a.base, 'tenant_alice_commit_1'),
      f.commit('Bob', b.base, 'tenant_bob_commit_1'),
    ])
    const acId = stringColumn(ac, 'id'),
      bcId = stringColumn(bc, 'id')
    const aj = await f.ci('Alice', a.base, acId),
      bj = await f.ci('Bob', b.base, bcId)
    async function deny() {
      for (const [intruder, repo, commit, job, key] of [
        ['Bob', a, acId, aj.id, 'tenant_alice_commit_1'],
        ['Alice', b, bcId, bj.id, 'tenant_bob_commit_1'],
        ['Charlie', a, acId, aj.id, 'tenant_alice_commit_1'],
        ['Charlie', b, bcId, bj.id, 'tenant_bob_commit_1'],
      ] as const) {
        for (const [path, body] of [
          [repo.base, undefined],
          [`${repo.base}/head`, undefined],
          [`${repo.base}/commits`, request('unauthorized_commit_1', commit)],
          [`${repo.base}/commits/${commit}`, undefined],
          [`${repo.base}/files/${commit}?path=src%2Fa.txt`, undefined],
          [`${repo.base}/tree?commit=${commit}`, undefined],
          [`${repo.base}/idempotency/${key}`, undefined],
          [`${repo.base}/ci/commits/${commit}`, {}],
          [`${repo.base}/ci/jobs/${job}`, undefined],
          [`${repo.base}/ci/jobs/${job}/receipt`, undefined],
          [`${repo.base}/ci/jobs`, undefined],
          [`${repo.base}/ci/jobs/${job}/cancel`, undefined],
        ] as const) {
          const res = await f.response(
            intruder,
            path,
            body,
            path.endsWith('/cancel')
              ? 'POST'
              : body === undefined
                ? 'GET'
                : 'POST',
          )
          expect(res.status, `${intruder} ${path}`).toBe(403)
          expect(await res.json()).toMatchObject({
            ok: false,
            error: { code: 'FORBIDDEN' },
          })
        }
      }
    }
    await deny()
    expect(
      (
        await f.fetch(a.base, {
          headers: {
            authorization: `Bearer ${f.tokens.Bob}`,
            'x-user-id': 'Alice',
            'x-owner-id': 'Alice',
            'x-role': 'admin',
          },
        })
      ).status,
    ).toBe(403)
    expect(await f.value('Alice', `${a.base}/head`)).toEqual({
      commitId: acId,
      version: 1,
    })
    expect(await f.value('Bob', `${b.base}/head`)).toEqual({
      commitId: bcId,
      version: 1,
    })
    // A valid owner cannot retrieve a foreign job by placing it under their own repository.
    expect((await f.response('Bob', `${b.base}/ci/jobs/${aj.id}`)).status).toBe(
      404,
    )
    expect((await f.response('Bob', `${b.base}/commits/${acId}`)).status).toBe(
      404,
    )
    expect((await f.response('Charlie', '/api/repositories')).status).toBe(404)
    const competing = await Promise.all(
      ['tenant_alice_race_1', 'tenant_alice_race_2'].map((key) =>
        f.response('Alice', `${a.base}/commits`, request(key, acId, 'next\n')),
      ),
    )
    expect(competing.map((r) => r.status).sort()).toEqual([200, 409])
    expect((await f.value('Alice', `${a.base}/head`)).version).toBe(2)
    expect(await f.value('Bob', `${b.base}/head`)).toEqual({
      commitId: bcId,
      version: 1,
    })
    const namespace = await f.namespace(),
      canonical = namespace.idFromName(`repo:${a.id}`).toString()
    await f.restart()
    expect((await f.namespace()).idFromName(`repo:${a.id}`).toString()).toBe(
      canonical,
    )
    await deny()
    expect(await f.value('Alice', a.base)).toEqual(a.metadata)
    expect(await f.value('Bob', b.base)).toEqual(b.metadata)
    expect(await f.value('Alice', `${a.base}/commits/${acId}`)).toEqual(ac)
    expect(
      await f.value('Alice', `${a.base}/ci/jobs/${aj.id}/receipt`),
    ).toEqual(aj.receipt)
    expect(await f.value('Bob', `${b.base}/ci/jobs/${bj.id}/receipt`)).toEqual(
      bj.receipt,
    )
    expect(
      (
        await f.response(
          'Bob',
          a.base,
          {
            name: 'Private repository',
            idempotencyKey: 'tenant_creation_key_1',
          },
          'PUT',
        )
      ).status,
    ).toBe(403)
    const wrong = (await f.namespace()).get(
      (await f.namespace()).idFromName('user:Alice'),
    )
    expect(
      (
        await wrong.fetch(`http://localhost${a.base}`, {
          headers: { authorization: `Bearer ${f.tokens.Alice}` },
        })
      ).status,
    ).toBe(400)
  } finally {
    await f.close()
  }
}, 30000)
