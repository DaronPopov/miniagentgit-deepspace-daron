import { expect, it } from 'vitest'
import { identityFixture } from './identity-fixture'
import { workerFixture } from './worker-fixture'
import { creation, request } from './sqlite-fixture'
import { objectValue } from '../src/domain/validation'
import { stringColumn } from '../src/server/storage/database'
import { ciJobIdentity } from '../src/application/ci/pipelines'
import type { CiPipeline } from '../src/contracts/ci'

it('runs commit-addressed CI in real workerd SQLite, preserves history, and recovers interrupted jobs after recreation', async () => {
  const identity = await identityFixture(),
    worker = await workerFixture(identity.env)
  const headers = {
    authorization: `Bearer ${await identity.token()}`,
    'content-type': 'application/json',
  }
  async function value(path: string, body?: unknown, expected = 200) {
    const response = await worker.fetch(
      path,
      body === undefined
        ? { headers }
        : { method: 'POST', headers, body: JSON.stringify(body) },
    )
    const json: unknown = await response.json()
    expect(response.status, JSON.stringify(json)).toBe(expected)
    if (!objectValue(json) || !objectValue(json.value))
      throw new Error('Missing value')
    return json.value
  }
  async function receipt(path: string) {
    // Bounded authorized observations drive recovery; no cloud requests or timer sleeps.
    for (let n = 0; n < 20; n++) {
      const response = await worker.fetch(`${path}/receipt`, { headers })
      if (response.status === 200) {
        const json: unknown = await response.json()
        if (!objectValue(json) || !objectValue(json.value))
          throw new Error('Missing receipt')
        return json.value
      }
      expect(response.status).toBe(409)
    }
    throw new Error(
      'Local validation did not finish within bounded observations',
    )
  }
  try {
    const repo = await value('/api/repositories', creation),
      id = stringColumn(repo, 'id')
    const base = `/api/repositories/${id}`
    const bad = await value(
      `${base}/commits`,
      request('ci_workerd_bad_key', null, 'trailing \n'),
    )
    const badId = stringColumn(bad, 'id')
    const admitted = await value(`${base}/ci/commits/${badId}`, {}, 202)
    expect(admitted.state).toBe('queued')
    const badJob = stringColumn(admitted, 'id')
    expect(await receipt(`${base}/ci/jobs/${badJob}`)).toMatchObject({
      state: 'failed',
      code: 'checks_failed',
    })
    const good = await value(
      `${base}/commits`,
      request('ci_workerd_good_key', badId, 'fixed\n'),
    )
    const goodId = stringColumn(good, 'id')
    const job = await value(`${base}/ci/commits/${goodId}`, {}, 202),
      jobId = stringColumn(job, 'id')
    const passed = await receipt(`${base}/ci/jobs/${jobId}`)
    expect(passed.state).toBe('passed')
    expect((await value(`${base}/ci/commits/${goodId}`, {}, 202)).id).toBe(
      jobId,
    )
    expect(await value(`${base}/head`)).toEqual({
      commitId: goodId,
      version: 2,
    })
    expect(
      (
        await worker.fetch(`${base}/files/${badId}?path=src%2Fa.txt`, {
          headers,
        })
      ).status,
    ).toBe(200)
    await worker.restart()
    expect(await value(`${base}/ci/jobs/${jobId}/receipt`)).toEqual(passed)
    // Seed a genuinely persisted interrupted generation, not a fake executor success.
    const next = await value(
      `${base}/commits`,
      request('ci_workerd_recover_key', goodId, 'recovered\n'),
    )
    const nextId = stringColumn(next, 'id')
    if (!objectValue(job.pipeline)) throw new Error('Missing pipeline')
    const pipeline: CiPipeline = {
      id: 'miniagentgit-ci-v1',
      version: 1,
      fingerprint: stringColumn(job.pipeline, 'fingerprint'),
    }
    const recoveryId = await ciJobIdentity(id, nextId, pipeline)
    const storage = await worker.storage(`repo:${id}`)
    await storage.exec(
      `INSERT INTO ci_jobs(id,repository_id,commit_id,pipeline_id,fingerprint,pipeline_version,state,generation,attempts,created_ms,updated_ms,deadline_ms,code,storage_bytes) VALUES (?,?,?,?,?,1,'running',1,1,1,1,2,'none',9216)`,
      recoveryId,
      id,
      nextId,
      pipeline.id,
      pipeline.fingerprint,
    )
    await worker.restart()
    const recovered = await receipt(`${base}/ci/jobs/${recoveryId}`)
    expect(recovered).toMatchObject({ state: 'passed', generation: 3 })
    expect(await value(`${base}/head`)).toEqual({
      commitId: nextId,
      version: 3,
    })
    const other = { authorization: `Bearer ${await identity.token('other')}` }
    expect(
      (await worker.fetch(`${base}/ci/jobs/${jobId}`, { headers: other }))
        .status,
    ).toBe(403)
    expect((await worker.fetch(`${base}/ci/jobs/${jobId}`)).status).toBe(401)
  } finally {
    await worker.close()
  }
}, 30000)
