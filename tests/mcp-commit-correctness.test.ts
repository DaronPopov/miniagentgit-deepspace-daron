import { expect, it } from 'vitest'
import { agentCredentialFixture } from './agent-credential-fixture'
import { FREE_TIER_LIMITS as limits } from '../src/application/resource-limits'
import { stringColumn } from '../src/server/storage/database'
import { creation, request } from './sqlite-fixture'
import { endpoint, tool, workflowClient } from './mcp-workflow-client'

it('enforces text limits, CAS and replay even after the client loses a committed response', async () => {
  const f = await agentCredentialFixture()
  try {
    const agent = workflowClient(f, f.tokens.Alice)
    await agent.client.initialize()
    const repositoryId = stringColumn(
      await agent.value('repository_create', creation),
      'id',
    )
    const initial = { ...request('mcp_initial_commit'), repositoryId }
    for (const [input, code] of [
      [{ ...initial, expectedHead: 0 }, 'INVALID_INPUT'],
      [
        { ...initial, changes: [{ kind: 'put', path: '../bad.ts', text: '' }] },
        'INVALID_INPUT',
      ],
      [
        {
          ...initial,
          changes: [{ kind: 'patch', path: 'src/a.ts', text: '' }],
        },
        'INVALID_INPUT',
      ],
      [
        { ...initial, changes: [...initial.changes, ...initial.changes] },
        'INVALID_INPUT',
      ],
      [
        {
          ...initial,
          changes: [
            {
              kind: 'put',
              path: 'big.ts',
              text: 'é'.repeat(limits.fileBytes / 2 + 1),
            },
          ],
        },
        'QUOTA_EXCEEDED',
      ],
      [
        {
          ...initial,
          changes: Array.from({ length: 17 }, (_, i) => ({
            kind: 'delete',
            path: 'src/' + i,
          })),
        },
        'QUOTA_EXCEEDED',
      ],
      [
        {
          ...initial,
          changes: Array.from({ length: 5 }, (_, i) => ({
            kind: 'put',
            path: 'src/' + i,
            text: 'x'.repeat(limits.fileBytes),
          })),
        },
        'QUOTA_EXCEEDED',
      ],
    ] as const)
      await agent.error('repository_commit', input, code)

    const full = {
      ...initial,
      changes: Array.from({ length: 4 }, (_, i) => ({
        kind: 'put',
        path: 'src/' + i,
        text: 'x'.repeat(limits.fileBytes),
      })),
    }
    const lossy = workflowClient(f, f.tokens.Alice, () => {
      throw new Error('Simulated connection loss after workerd responded')
    })
    await expect(lossy.call('repository_commit', full)).rejects.toThrow()
    const created = await agent.value('repository_commit', full)
    const head = stringColumn(created, 'id')
    expect(
      await agent.value('repository_head', { repositoryId }),
    ).toMatchObject({ commitId: head, version: 1 })
    await agent.error(
      'repository_commit',
      { ...full, message: 'Different' },
      'CONFLICT',
    )
    await agent.error(
      'repository_commit',
      { ...initial, idempotencyKey: 'valid_stale_request' },
      'CONFLICT',
    )

    const attempt = (key: string) => ({ ...request(key, head), repositoryId })
    const concurrent = await Promise.all([
      agent.call('repository_commit', attempt('concurrent_commit_1')),
      agent.call('repository_commit', attempt('concurrent_commit_2')),
    ])
    expect(concurrent.map(({ isError }) => isError).sort()).toEqual([
      false,
      true,
    ])
    expect(JSON.stringify(concurrent.find(({ isError }) => isError))).toContain(
      'CONFLICT',
    )
    expect(
      await agent.value('repository_head', { repositoryId }),
    ).toMatchObject({ version: 2 })

    const rest = await f.send(
      f.tokens.Alice,
      endpoint + '/tools/' + tool('repository_commit'),
      { input: full },
    )
    expect(rest.status).toBe(200)
    expect(await rest.json()).toEqual({ ok: true, result: created })
    const malformed = await f.send(
      f.tokens.Alice,
      endpoint + '/tools/' + tool('repository_commit'),
      { input: { ...full, ownerSubject: 'Bob' } },
    )
    expect(malformed.status).toBe(400)
    const storage = await f.storage('repo:' + repositoryId)
    expect(await storage.exec('SELECT COUNT(*) AS count FROM commits')).toEqual(
      [{ count: 2 }],
    )
  } finally {
    await f.close()
  }
}, 30000)
