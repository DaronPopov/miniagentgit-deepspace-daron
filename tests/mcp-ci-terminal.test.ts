import { expect, it } from 'vitest'
import { objectValue } from '../src/domain/validation'
import { agentCredentialFixture } from './agent-credential-fixture'
import { stringColumn } from '../src/server/storage/database'
import { creation, request } from './sqlite-fixture'
import { workflowClient } from './mcp-workflow-client'

it('returns the authoritative cancelled job and receipt through MCP', async () => {
  const f = await agentCredentialFixture(true)
  try {
    const agent = workflowClient(f, await f.token())
    const repositoryId = stringColumn(
      await agent.value('repository_create', creation),
      'id',
    )
    const commitId = stringColumn(
      await agent.value('repository_commit', {
        ...request(undefined, null, 'hello\n'),
        repositoryId,
      }),
      'id',
    )
    const job = await agent.value('ci_request', { repositoryId, commitId })
    const jobId = stringColumn(job, 'id')
    const context = { repositoryId, jobId }
    expect(job.state).toBe('queued')
    // Cancellation remains the existing owner-only HTTP operation.
    const cancel =
      '/api/repositories/' + repositoryId + '/ci/jobs/' + jobId + '/cancel'
    expect((await f.response('Alice', cancel, {})).status).toBe(400)
    const response = await f.response('Alice', cancel, undefined, 'POST')
    expect(response.status, await response.clone().text()).toBe(200)
    const body: unknown = await response.json()
    if (!objectValue(body)) throw new Error('Missing cancellation result')
    const stopped = body.value
    expect(stopped).toMatchObject({ state: 'cancelled' })
    expect(await agent.value('ci_status', context)).toEqual(stopped)
    const receipt = await agent.value('ci_receipt', context)
    expect(receipt).toMatchObject({
      terminalState: 'cancelled',
      state: 'failed',
      code: 'cancelled',
      checks: { typescript: 'deferred' },
    })
    expect(
      (await agent.value('ci_request', { repositoryId, commitId })).id,
    ).toBe(jobId)
    expect(await agent.value('ci_receipt', context)).toEqual(receipt)
  } finally {
    await f.close()
  }
}, 30000)
