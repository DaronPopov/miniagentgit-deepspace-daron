import { objectValue } from '../src/domain/validation'
import { expect, it } from 'vitest'
import { tenantFixture } from './tenant-fixture'
import {
  REPOSITORY_HEAD_TOOL,
  TOOL_RESULT_BYTES,
} from '../src/features/agent-tools/contracts'

const base = '/_deepspace/agent'
it('discovers and invokes the actual SDK REST tool through canonical workerd/SQLite ownership', async () => {
  const f = await tenantFixture()
  try {
    const a = await f.create('Alice'),
      b = await f.create('Bob')
    const discovery = await f.response('Charlie', `${base}/tools`)
    expect(discovery.status).toBe(200)
    const metadata = await discovery.json()
    expect(metadata).toMatchObject({
      ok: true,
      app: { name: 'MiniAgentGit' },
    })
    if (!objectValue(metadata) || !Array.isArray(metadata.tools))
      throw new Error('Missing tool metadata')
    expect(metadata.tools).toHaveLength(6)
    expect(metadata.tools).toContainEqual(
      expect.objectContaining({
        name: REPOSITORY_HEAD_TOOL,
        inputSchema: expect.objectContaining({ additionalProperties: false }),
        outputSchema: expect.objectContaining({ type: 'object' }),
      }),
    )
    const descriptions = JSON.stringify(metadata)
    for (const privateValue of [
      a.id,
      b.id,
      'ownerSubject',
      f.tokens.Alice,
      'BEGIN PRIVATE',
      'Alice',
    ])
      expect(descriptions).not.toContain(privateValue)
    const md = await f.response('Alice', `${base}/tools.md`)
    expect(md.headers.get('content-type')).toContain('text/markdown')
    expect(await md.text()).toContain(REPOSITORY_HEAD_TOOL)
    async function head(subject: 'Alice' | 'Bob' | 'Charlie', id: string) {
      return f.response(subject, `${base}/tools/${REPOSITORY_HEAD_TOOL}`, {
        input: { repositoryId: id },
      })
    }
    expect(await (await head('Alice', a.id)).json()).toEqual({
      ok: true,
      result: { repositoryId: a.id, commitId: null, version: 0 },
    })
    expect(await (await head('Bob', b.id)).json()).toMatchObject({
      result: { repositoryId: b.id, commitId: null, version: 0 },
    })
    for (const subject of ['Bob', 'Charlie'] as const) {
      const denied = await head(subject, a.id)
      expect(denied.status).toBe(403)
      expect(await denied.json()).toMatchObject({
        ok: false,
        code: 'FORBIDDEN',
      })
    }
    const missing = await head('Alice', 'repo_' + 'z'.repeat(32))
    expect(missing.status).toBe(404)
    const commit = await f.commit('Alice', a.base, 'tool_head_commit_key_1')
    const ci = await f.ci('Alice', a.base, String(commit.id))
    const storage = await f.storage(`repo:${a.id}`)
    const tables = [
      'repository',
      'head',
      'commits',
      'file_contents',
      'manifest_entries',
      'idempotency',
      'ci_jobs',
      'ci_receipts',
    ] as const
    const snapshot = () =>
      Promise.all(
        tables.map((table) =>
          storage.exec(`SELECT * FROM ${table} ORDER BY 1`),
        ),
      )
    const durableBefore = await snapshot()
    const beforeHead = await f.value('Alice', `${a.base}/head`)
    const beforeJobs = await f.value('Alice', `${a.base}/ci/jobs`)
    const response = await head('Alice', a.id),
      text = await response.text()
    expect(response.status).toBe(200)
    expect(JSON.parse(text)).toEqual({
      ok: true,
      result: { repositoryId: a.id, commitId: commit.id, version: 1 },
    })
    expect(new TextEncoder().encode(text).byteLength).toBeLessThan(
      TOOL_RESULT_BYTES,
    )
    expect(text).not.toMatch(
      /Bearer|token|authorization|Alice|ownerSubject|claims|SQL/,
    )
    expect(await snapshot()).toEqual(durableBefore)
    expect(await f.value('Alice', `${a.base}/head`)).toEqual(beforeHead)
    expect(await f.value('Alice', `${a.base}/ci/jobs`)).toEqual(beforeJobs)
    expect(
      await f.value('Alice', `${a.base}/ci/jobs/${ci.id}/receipt`),
    ).toEqual(ci.receipt)
    await f.restart()
    expect(await (await head('Alice', a.id)).json()).toMatchObject({
      result: { commitId: commit.id, version: 1 },
    })
    expect((await head('Bob', a.id)).status).toBe(403)
  } finally {
    await f.close()
  }
}, 30000)

it('exercises the installed native MCP subset with the same verified bearer and persisted owner', async () => {
  const f = await tenantFixture()
  try {
    const a = await f.create('Alice')
    const invoke = (
      subject: 'Alice' | 'Bob',
      method: string,
      params: unknown,
      id: number | undefined = 1,
    ) =>
      f.response(subject, `${base}/mcp`, {
        jsonrpc: '2.0',
        ...(id === undefined ? {} : { id }),
        method,
        params,
      })
    const initialized = await invoke('Alice', 'initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'local-qualification', version: '1' },
    })
    expect(await initialized.json()).toMatchObject({
      jsonrpc: '2.0',
      result: { protocolVersion: '2025-11-25', capabilities: { tools: {} } },
    })
    expect(
      await (await invoke('Alice', 'tools/list', {})).json(),
    ).toMatchObject({
      result: {
        tools: expect.arrayContaining([
          expect.objectContaining({ name: REPOSITORY_HEAD_TOOL }),
        ]),
      },
    })
    const call = await invoke('Alice', 'tools/call', {
      name: REPOSITORY_HEAD_TOOL,
      arguments: { repositoryId: a.id },
    })
    expect(await call.json()).toMatchObject({
      result: {
        isError: false,
        structuredContent: { repositoryId: a.id, commitId: null, version: 0 },
      },
    })
    const denied = await invoke('Bob', 'tools/call', {
      name: REPOSITORY_HEAD_TOOL,
      arguments: { repositoryId: a.id },
    })
    expect(await denied.json()).toMatchObject({ result: { isError: true } })
    expect((await f.response('Alice', `${base}/mcp`)).status).toBe(405)
    expect(
      await (await invoke('Alice', 'unknown/method', {})).json(),
    ).toMatchObject({ error: { code: -32601 } })
  } finally {
    await f.close()
  }
}, 30000)
