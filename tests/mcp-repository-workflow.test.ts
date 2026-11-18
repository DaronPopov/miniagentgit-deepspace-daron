import { expect, it } from 'vitest'
import { agentCredentialFixture } from './agent-credential-fixture'
import { matches } from '../src/features/agent-tools/json-schema'
import type { Operation } from '../src/features/agent-tools/operation-inputs'
import {
  operationInputs,
  operationOutputs,
} from '../src/features/agent-tools/operation-schemas'
import { stringColumn } from '../src/server/storage/database'
import { creation, request } from './sqlite-fixture'
import { endpoint, tool, workflowClient } from './mcp-workflow-client'

it('completes failing-to-passing static CI using only native MCP workflow calls', async () => {
  const f = await agentCredentialFixture(true)
  try {
    const token = await f.token()
    const agent = workflowClient(f, token)
    expect(await agent.client.initialize()).toMatchObject({
      capabilities: { tools: {} },
    })
    await agent.client.notify('notifications/initialized')
    const list = await agent.client.listTools()
    expect(list.map((entry) => entry.name).sort()).toEqual([
      'miniagentgit.ci_receipt',
      'miniagentgit.ci_request',
      'miniagentgit.ci_status',
      'miniagentgit.repository_commit',
      'miniagentgit.repository_create',
      'miniagentgit.repository_head',
    ])
    const discovery = await f.send(token, endpoint + '/tools')
    expect(discovery.status).toBe(200)
    expect(await discovery.json()).toMatchObject({ tools: list })
    const markdown = await (await f.send(token, endpoint + '/tools.md')).text()
    for (const entry of list) expect(markdown).toContain(entry.name)

    async function invoke(name: Operation, input: Record<string, unknown>) {
      const definition = list.find((entry) => entry.name === tool(name))
      expect(definition).toMatchObject({
        inputSchema: operationInputs[name],
        outputSchema: operationOutputs[name],
      })
      expect(matches(operationInputs[name], input)).toBe(true)
      const value = await agent.value(name, input)
      expect(matches(operationOutputs[name], value)).toBe(true)
      return value
    }

    const repo = await invoke('repository_create', creation)
    const repositoryId = stringColumn(repo, 'id')
    const head = () => agent.value('repository_head', { repositoryId })
    expect(await head()).toEqual({ repositoryId, commitId: null, version: 0 })
    expect(await invoke('repository_create', creation)).toEqual(repo)
    await agent.error(
      'repository_create',
      { ...creation, name: 'Changed' },
      'CONFLICT',
    )
    const initial = {
      ...request('workflow_commit_initial'),
      repositoryId,
      changes: [
        {
          kind: 'put',
          path: 'src/main.ts',
          text: 'import { value } from "./dep";\nexport const result = value;\nthrow Error("must never execute");\n',
        },
      ],
    }
    const first = await invoke('repository_commit', initial)
    const firstId = stringColumn(first, 'id')
    expect(await head()).toEqual({
      repositoryId,
      commitId: firstId,
      version: 1,
    })
    expect(await invoke('repository_commit', initial)).toEqual(first)
    const admit = (commitId: string) =>
      invoke('ci_request', { repositoryId, commitId })
    const firstJob = await admit(firstId)
    const firstJobId = stringColumn(firstJob, 'id')
    expect(firstJob).toMatchObject({ state: 'queued', commitId: firstId })
    await agent.error(
      'ci_receipt',
      { repositoryId, jobId: firstJobId },
      'CONFLICT',
    )
    expect((await admit(firstId)).id).toBe(firstJobId)

    async function terminal(jobId: string, state: string) {
      // Wait before observing so the SDK JobRoom alarm can continue independently.
      await expect
        .poll(
          async () =>
            (await invoke('ci_status', { repositoryId, jobId })).state,
          { timeout: 5000, interval: 50 },
        )
        .toBe(state)
      return invoke('ci_receipt', { repositoryId, jobId })
    }
    const failed = await terminal(firstJobId, 'failed')
    expect(failed).toMatchObject({
      terminalState: 'failed',
      commitId: firstId,
      checks: { imports: 'failed', typescript: 'deferred' },
      diagnostics: [
        expect.objectContaining({
          check: 'imports',
          code: 'missing_import',
          path: 'src/main.ts',
        }),
      ],
    })

    expect((await head()).commitId).toBe(firstId)
    const fix = {
      ...request('workflow_commit_corrected', firstId),
      repositoryId,
      changes: [
        { kind: 'put', path: 'src/dep.ts', text: 'export const value = 42;\n' },
      ],
    }
    const corrected = await invoke('repository_commit', fix)
    const secondId = stringColumn(corrected, 'id')
    expect(corrected.parentId).toBe(firstId)
    expect(await invoke('repository_commit', initial)).toEqual(first)
    expect(await invoke('repository_commit', fix)).toEqual(corrected)
    expect(await head()).toEqual({
      repositoryId,
      commitId: secondId,
      version: 2,
    })
    const secondJob = await admit(secondId)
    const secondJobId = stringColumn(secondJob, 'id')
    const passed = await terminal(secondJobId, 'passed')
    expect(passed).toMatchObject({
      terminalState: 'passed',
      commitId: secondId,
      checks: {
        manifest: 'passed',
        source: 'passed',
        syntax: 'passed',
        lint: 'passed',
        imports: 'passed',
        typescript: 'deferred',
      },
      diagnostics: [],
    })
    await f.restart()
    expect(
      await invoke('ci_receipt', { repositoryId, jobId: firstJobId }),
    ).toEqual(failed)
    expect(
      await invoke('ci_receipt', { repositoryId, jobId: secondJobId }),
    ).toEqual(passed)
    expect((await admit(firstId)).id).toBe(firstJobId)
    expect(await head()).toEqual({
      repositoryId,
      commitId: secondId,
      version: 2,
    })
    const storage = await f.storage(`repo:${repositoryId}`)
    expect(await storage.exec('SELECT id FROM commits ORDER BY id')).toEqual(
      [firstId, secondId].sort().map((id) => ({ id })),
    )
  } finally {
    await f.close()
  }
}, 30000)
