import { expect, it } from 'vitest'
import { agentCredentialFixture } from './agent-credential-fixture'
import { stringColumn } from '../src/server/storage/database'
import { creation, request } from './sqlite-fixture'
import { endpoint, tool, workflowClient } from './mcp-workflow-client'

it('uses the same REST and MCP contracts for every tool and rejects malformed wire text', async () => {
  const f = await agentCredentialFixture()
  try {
    const token = await f.token()
    const agent = workflowClient(f, token)
    async function parity(name: string, input: Record<string, unknown>) {
      const path = endpoint + '/tools/' + tool(name)
      const value = await agent.value(name, input)
      const response = await f.send(token, path, { input })
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ ok: true, result: value })
      const bad = { ...input, owner: token }
      const failure = await f.send(token, path, { input: bad })
      expect(failure.status).toBe(400)
      expect(await failure.text()).not.toContain(token)
      await agent.error(
        name,
        bad,
        name === 'repository_head' ? 'invalid_tool_input' : 'INVALID_INPUT',
      )
      return value
    }
    const repositoryId = stringColumn(
      await parity('repository_create', creation),
      'id',
    )
    await parity('repository_head', { repositoryId })
    const commit = { ...request(undefined, null, 'hello\n'), repositoryId }
    const commitId = stringColumn(
      await parity('repository_commit', commit),
      'id',
    )
    const admission = await agent.value('ci_request', {
      repositoryId,
      commitId,
    })
    const jobId = stringColumn(admission, 'id')
    const context = { repositoryId, jobId }
    await expect
      .poll(async () => (await agent.value('ci_status', context)).state)
      .toBe('passed')
    await parity('ci_request', { repositoryId, commitId })
    await parity('ci_status', context)
    await parity('ci_receipt', context)

    const payload = JSON.stringify({
      input: {
        ...commit,
        expectedHead: commitId,
        idempotencyKey: 'malformed_utf8_key',
        message: 'INVALID_BYTE_MARKER',
      },
    })
    const raw = new TextEncoder().encode(payload)
    raw[payload.indexOf('INVALID_BYTE_MARKER')] = 0xff
    const malformed = await f.fetch(
      endpoint + '/tools/' + tool('repository_commit'),
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer ' + token,
          'content-type': 'application/json',
        },
        body: raw,
      },
    )
    expect(malformed.status).toBe(400)
    expect(
      await agent.value('repository_head', { repositoryId }),
    ).toMatchObject({ commitId, version: 1 })
  } finally {
    await f.close()
  }
}, 30000)
