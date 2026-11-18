import { createMcpTestClient } from 'deepspace/testing/mcp'
import { expect } from 'vitest'
import { objectValue } from '../src/domain/validation'
import type { agentCredentialFixture } from './agent-credential-fixture'

export const endpoint = '/_deepspace/agent'
export const tool = (name: string) => 'miniagentgit.' + name

export function workflowClient(
  fixture: Pick<Awaited<ReturnType<typeof agentCredentialFixture>>, 'fetch'>,
  token: string,
  receive: (response: Response) => Response = (response) => response,
) {
  const client = createMcpTestClient('http://localhost', {
    endpoint: endpoint + '/mcp',
    fetch: async (input, init) => {
      if (init?.body !== undefined && typeof init.body !== 'string')
        throw new Error('Unexpected fixture body')
      const url = new URL(String(input))
      if (
        url.origin !== 'http://localhost' ||
        url.pathname !== endpoint + '/mcp'
      )
        throw new Error('Unexpected fixture target')
      const headers = new Headers(init?.headers)
      headers.set('authorization', 'Bearer ' + token)
      const response = await fixture.fetch(url.pathname, {
        method: init?.method,
        headers: Object.fromEntries(headers),
        body: init?.body,
      })
      return receive(
        new Response(await response.arrayBuffer(), {
          status: response.status,
          headers: Object.fromEntries(response.headers),
        }),
      )
    },
  })
  const call = (name: string, args: Record<string, unknown>) =>
    client.callTool(tool(name), args)
  async function value(name: string, args: Record<string, unknown>) {
    const response = await call(name, args)
    expect(response.isError, JSON.stringify(response)).toBe(false)
    expect(JSON.stringify(response)).not.toContain(token)
    if (!objectValue(response.structuredContent))
      throw new Error('Missing tool result')
    return response.structuredContent
  }
  async function error(
    name: string,
    args: Record<string, unknown>,
    code: string,
  ) {
    const response = await call(name, args)
    expect(response).toMatchObject({ isError: true })
    expect(response.structuredContent).toBeUndefined()
    const serialized = JSON.stringify(response)
    expect(serialized).toContain(code)
    expect(serialized).not.toContain(token)
    expect(serialized.length).toBeLessThan(1024)
  }
  return { client, call, value, error }
}
