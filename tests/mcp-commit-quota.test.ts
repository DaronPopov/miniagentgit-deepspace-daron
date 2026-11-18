import { expect, it } from 'vitest'
import { agentCredentialFixture } from './agent-credential-fixture'
import { FREE_TIER_LIMITS as limits } from '../src/application/resource-limits'
import { stringColumn } from '../src/server/storage/database'
import { creation, request } from './sqlite-fixture'
import { workflowClient } from './mcp-workflow-client'

it('keeps the retained repository byte quota transactional through MCP', async () => {
  const f = await agentCredentialFixture()
  try {
    const agent = workflowClient(f, await f.token())
    const repositoryId = stringColumn(
      await agent.value('repository_create', creation),
      'id',
    )
    let head: string | null = null
    let version = 0
    for (; version < 65; version++) {
      const changes = Array.from({ length: 4 }, (_, index) => ({
        kind: 'put',
        path: 'src/' + index,
        text: (version + ':' + index + ':').padEnd(limits.fileBytes, 'x'),
      }))
      const result = await agent.call('repository_commit', {
        ...request('retained_quota_' + version, head),
        repositoryId,
        changes,
      })
      if (result.isError) {
        expect(JSON.stringify(result)).toContain('QUOTA_EXCEEDED')
        break
      }
      const output = result.structuredContent
      if (typeof output?.id !== 'string') throw new Error('Missing commit ID')
      head = output.id
    }
    expect(version).toBeGreaterThan(1)
    expect(version).toBeLessThan(65)
    expect(
      await agent.value('repository_head', { repositoryId }),
    ).toMatchObject({ commitId: head, version })
    const storage = await f.storage('repo:' + repositoryId)
    expect(await storage.exec('SELECT COUNT(*) AS count FROM commits')).toEqual(
      [{ count: version }],
    )
  } finally {
    await f.close()
  }
}, 30000)
