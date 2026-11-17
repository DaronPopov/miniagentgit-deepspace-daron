import { createMcpTestClient, McpRpcError } from 'deepspace/testing/mcp'
import { expect, it } from 'vitest'
import { tenantFixture } from './tenant-fixture'
import { REPOSITORY_HEAD_TOOL } from '../src/features/agent-tools/contracts'

it('qualifies the installed SDK MCP test client over real workerd HTTP with bearer injection', async () => {
  const f = await tenantFixture()
  try {
    const a = await f.create('Alice')
    function client(subject: 'Alice' | 'Bob') {
      return createMcpTestClient('http://localhost', {
        endpoint: '/_deepspace/agent/mcp',
        fetch: async (input, init) => {
          const headers = new Headers(init?.headers)
          headers.set('authorization', `Bearer ${f.tokens[subject]}`)
          if (init?.body !== undefined && typeof init.body !== 'string')
            throw new Error('Unexpected test-client body')
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
    }
    const alice = client('Alice')
    expect(await alice.initialize()).toMatchObject({
      capabilities: { tools: {} },
    })
    await alice.notify('notifications/initialized')
    expect((await alice.listTools()).map((tool) => tool.name)).toEqual([
      REPOSITORY_HEAD_TOOL,
    ])
    const result = await alice.callTool(REPOSITORY_HEAD_TOOL, {
      repositoryId: a.id,
    })
    expect(result).toMatchObject({
      isError: false,
      structuredContent: { repositoryId: a.id, commitId: null, version: 0 },
    })
    const bob = client('Bob')
    await bob.initialize()
    expect(
      await bob.callTool(REPOSITORY_HEAD_TOOL, { repositoryId: a.id }),
    ).toMatchObject({ isError: true })
    alice.protocolVersion = 'unsupported'
    await expect(alice.listTools()).rejects.toBeInstanceOf(McpRpcError)
  } finally {
    await f.close()
  }
}, 30000)
