import { createMcpTestClient } from 'deepspace/testing/mcp'
import { expect, it } from 'vitest'
import { agentCredentialFixture } from './agent-credential-fixture'
import { REPOSITORY_HEAD_TOOL } from '../src/features/agent-tools/contracts'

it('uses actual SDK MCP initialization/discovery/calls with scoped credentials and distinguishable owner errors', async () => {
  const f = await agentCredentialFixture()
  try {
    const a = await f.create('Alice')
    const aliceToken = await f.token()
    const client = (token: string) =>
      createMcpTestClient('http://localhost', {
        endpoint: '/_deepspace/agent/mcp',
        fetch: async (input, init) => {
          if (init?.body !== undefined && typeof init.body !== 'string')
            throw new Error('Unexpected fixture body')
          const headers = new Headers(init?.headers)
          headers.set('authorization', `Bearer ${token}`)
          const response = await f.fetch(new URL(String(input)).pathname, {
            method: init?.method,
            headers: Object.fromEntries(headers),
            body: init?.body,
          })
          return new Response(await response.arrayBuffer(), {
            status: response.status,
            headers: Object.fromEntries(response.headers),
          })
        },
      })
    const alice = client(aliceToken)
    expect(await alice.initialize()).toMatchObject({
      capabilities: { tools: {} },
    })
    await alice.notify('notifications/initialized')
    expect((await alice.listTools()).map((t) => t.name)).toContain(
      REPOSITORY_HEAD_TOOL,
    )
    expect(
      await alice.callTool(REPOSITORY_HEAD_TOOL, { repositoryId: a.id }),
    ).toMatchObject({
      isError: false,
      structuredContent: { repositoryId: a.id, commitId: null, version: 0 },
    })
    const commit = await f.commit('Alice', a.base, 'scoped_mcp_commit_1')
    expect(
      await alice.callTool(REPOSITORY_HEAD_TOOL, { repositoryId: a.id }),
    ).toMatchObject({
      isError: false,
      structuredContent: { commitId: commit.id, version: 1 },
    })
    for (const subject of ['Bob', 'Charlie']) {
      const denied = client(await f.token(subject))
      await denied.initialize()
      const result = await denied.callTool(REPOSITORY_HEAD_TOOL, {
        repositoryId: a.id,
      })
      expect(result).toMatchObject({ isError: true })
      expect(JSON.stringify(result)).toContain('FORBIDDEN')
      expect(JSON.stringify(result)).not.toContain(aliceToken)
    }
    const missing = await alice.callTool(REPOSITORY_HEAD_TOOL, {
      repositoryId: 'repo_' + 'z'.repeat(32),
    })
    expect(missing).toMatchObject({ isError: true })
    expect(JSON.stringify(missing)).toContain('NOT_FOUND')
    const invalid = await alice.callTool(REPOSITORY_HEAD_TOOL, {
      repositoryId: a.id,
      owner: aliceToken,
    })
    expect(invalid).toMatchObject({ isError: true })
    expect(JSON.stringify(invalid)).not.toContain(aliceToken)
    expect(
      (
        await f.send(
          await f.token('Alice', { exp: 1 }),
          '/_deepspace/agent/mcp',
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list',
          },
        )
      ).status,
    ).toBe(401)
    const discovery = await f.send(aliceToken, '/_deepspace/agent/tools.md')
    expect(discovery.status).toBe(200)
    expect(await discovery.text()).toContain(REPOSITORY_HEAD_TOOL)
  } finally {
    await f.close()
  }
}, 30000)
