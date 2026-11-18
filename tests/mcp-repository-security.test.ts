import { expect, it } from 'vitest'
import { agentCredentialFixture } from './agent-credential-fixture'
import { stringColumn } from '../src/server/storage/database'
import { creation, request } from './sqlite-fixture'
import { endpoint, tool, workflowClient } from './mcp-workflow-client'

it('denies scoped cross-owner reads and writes without changing any repository rows', async () => {
  const f = await agentCredentialFixture(true)
  try {
    const aliceToken = await f.token()
    const bobToken = await f.token('Bob')
    const alice = workflowClient(f, aliceToken)
    const bob = workflowClient(f, bobToken)
    await alice.client.initialize()
    await bob.client.initialize()
    const repositoryId = stringColumn(
      await bob.value('repository_create', creation),
      'id',
    )
    const own = stringColumn(
      await alice.value('repository_create', creation),
      'id',
    )
    expect(own).not.toBe(repositoryId)
    const change = { ...request(undefined, null, 'hello\n'), repositoryId }
    const commitId = stringColumn(
      await bob.value('repository_commit', change),
      'id',
    )
    const jobId = stringColumn(
      await bob.value('ci_request', { repositoryId, commitId }),
      'id',
    )
    const job = { repositoryId, jobId }
    await expect
      .poll(async () => (await bob.value('ci_status', job)).state)
      .toBe('passed')
    const receipt = await bob.value('ci_receipt', job)
    const storage = await f.storage('repo:' + repositoryId)
    const tables = await storage.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' ORDER BY name",
    )
    const snapshot = () =>
      Promise.all(
        tables.map(({ name }) => {
          if (
            typeof name !== 'string' ||
            !/^[A-Za-z_][A-Za-z_0-9]*$/.test(name)
          )
            throw new Error('Invalid table')
          return storage.exec('SELECT * FROM ' + name + ' ORDER BY 1')
        }),
      )
    const before = await snapshot()
    const checks = [
      ['repository_head', { repositoryId }],
      [
        'repository_commit',
        {
          ...change,
          expectedHead: commitId,
          idempotencyKey: 'foreign_commit_retry',
        },
      ],
      ['ci_request', { repositoryId, commitId }],
      ['ci_status', job],
      ['ci_receipt', job],
    ] as const
    for (const [name, input] of checks) {
      await alice.error(name, input, 'FORBIDDEN')
      const rest = await f.send(aliceToken, endpoint + '/tools/' + tool(name), {
        input,
      })
      expect(rest.status).toBe(403)
      expect(await rest.json()).toMatchObject({ ok: false, code: 'FORBIDDEN' })
    }
    await alice.error(
      'repository_create',
      { ...creation, ownerSubject: 'Bob' },
      'INVALID_INPUT',
    )
    await alice.error(
      'repository_create',
      { ...creation, repositoryId },
      'INVALID_INPUT',
    )
    await alice.error('ci_status', { repositoryId: own, jobId }, 'NOT_FOUND')
    await alice.error('ci_receipt', { repositoryId: own, jobId }, 'NOT_FOUND')
    await alice.error(
      'ci_request',
      { repositoryId: own, commitId },
      'NOT_FOUND',
    )
    await bob.error(
      'ci_request',
      { repositoryId, commitId, pipelineId: 'arbitrary' },
      'INVALID_INPUT',
    )
    const namespace = await f.namespace()
    const owner = namespace.get(namespace.idFromName('repo:' + repositoryId))
    const internal =
      'http://localhost' + endpoint + '/repositories/' + repositoryId
    expect(
      (
        await owner.fetch(internal, {
          method: 'PUT',
          headers: {
            authorization: 'Bearer ' + aliceToken,
            'content-type': 'application/json',
          },
          body: JSON.stringify(creation),
        })
      ).status,
    ).toBe(403)
    expect(
      (
        await owner.fetch(internal + '/commits', {
          method: 'POST',
          headers: {
            authorization: 'Bearer ' + aliceToken,
            'content-type': 'application/json',
            'x-user-id': 'Bob',
          },
          body: JSON.stringify(request()),
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await owner.fetch(internal + '/commits', {
          method: 'POST',
          headers: {
            authorization: 'Bearer ' + aliceToken,
            'content-type': 'application/json',
          },
          body: JSON.stringify(request()),
        })
      ).status,
    ).toBe(403)
    expect(
      (
        await owner.fetch(internal + '/ci/jobs/' + jobId + '/cancel', {
          method: 'POST',
          headers: { authorization: 'Bearer ' + bobToken },
        })
      ).status,
    ).toBe(404)
    expect(
      (
        await f.send(
          aliceToken,
          endpoint + '/repositories/' + repositoryId,
          creation,
          'PUT',
        )
      ).status,
    ).toBe(404)
    expect(
      (
        await f.send(
          bobToken,
          '/api/repositories/' + repositoryId + '/commits',
          request(),
        )
      ).status,
    ).toBe(401)
    expect(
      (await f.send(aliceToken, '/api/repositories', creation)).status,
    ).toBe(401)
    expect(await snapshot()).toEqual(before)
    expect(await bob.value('ci_receipt', job)).toEqual(receipt)
  } finally {
    await f.close()
  }
}, 30000)
