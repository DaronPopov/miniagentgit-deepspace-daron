import { expect, it } from 'vitest'
import { identityFixture } from './identity-fixture'
import { workerFixture } from './worker-fixture'
import { creation, request } from './sqlite-fixture'
import { objectValue } from '../src/domain/validation'
import { stringColumn } from '../src/server/storage/database'

it('runs integrity and source policy through actual JobRoom alarms', async () => {
  const identity = await identityFixture()
  const worker = await workerFixture(identity.env, true)
  const headers = {
    authorization: `Bearer ${await identity.token()}`,
    'content-type': 'application/json',
  }
  async function value(path: string, body?: unknown, status = 200) {
    const response = await worker.fetch(
      path,
      body === undefined
        ? { headers }
        : {
            headers,
            method: 'POST',
            body: JSON.stringify(body),
          },
    )
    const json: unknown = await response.json()
    expect(response.status, JSON.stringify(json)).toBe(status)
    if (!objectValue(json) || !objectValue(json.value))
      throw new Error('Missing value')
    return json.value
  }
  try {
    const id = stringColumn(await value('/api/repositories', creation), 'id')
    const base = `/api/repositories/${id}`
    const commit = stringColumn(
      await value(
        `${base}/commits`,
        request('ci_stage_valid_1', null, 'valid\n'),
      ),
      'id',
    )
    const admit = `${base}/ci/commits/${commit}`
    const admissions = await Promise.all([
      value(admit, {}, 202),
      value(admit, {}, 202),
    ])
    const job = stringColumn(admissions[0], 'id')
    expect(admissions[1].id).toBe(job)
    expect(
      (
        await worker.fetch(admit, {
          method: 'POST',
          headers,
          body: JSON.stringify({ pipelineId: 'arbitrary' }),
        })
      ).status,
    ).toBe(400)
    const receipt = `${base}/ci/jobs/${job}/receipt`
    let storage = await worker.storage(`repo:${id}`)
    if (process.env.CI_VERIFY_STAGE_RESTART === '1') {
      await expect
        .poll(
          async () => {
            const rows = await storage.exec(
              'SELECT sequence FROM ci_stages WHERE job_id=?',
              job,
            )
            return rows[0]?.sequence
          },
          { interval: 5, timeout: 5000 },
        )
        .toBe(1)
      await worker.restart()
      storage = await worker.storage(`repo:${id}`)
    }
    await expect
      .poll(
        async () => {
          const rows = await storage.exec(
            'SELECT sequence FROM ci_stages WHERE job_id=?',
            job,
          )
          return rows[0]?.sequence
        },
        { timeout: 5000 },
      )
      .toBe(2)
    const result = await value(receipt)
    expect(result).toMatchObject({
      terminalState: 'passed',
      generation: 1,
      pipeline: { version: 2 },
      checks: { manifest: 'passed', source: 'passed', typescript: 'deferred' },
    })
    expect((await value(admit, {}, 202)).id).toBe(job)
    expect(await value(`${base}/head`)).toEqual({
      commitId: commit,
      version: 1,
    })
    expect(
      (
        await worker.fetch('/_internal/ci/stage', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ciJobId: job }),
        })
      ).status,
    ).toBe(404)
    expect(
      (
        await worker.fetch(receipt, {
          headers: { authorization: `Bearer ${await identity.token('other')}` },
        })
      ).status,
    ).toBe(403)
    const charlie = {
      ...headers,
      authorization: `Bearer ${await identity.token('charlie')}`,
    }
    const other = await worker.fetch('/api/repositories', {
      headers: charlie,
      method: 'POST',
      body: JSON.stringify(creation),
    })
    expect(other.status).toBe(200)
    const otherData: unknown = await other.json()
    if (!objectValue(otherData) || !objectValue(otherData.value))
      throw new Error('Missing repository')
    const otherId = stringColumn(otherData.value, 'id')
    expect(otherId).not.toBe(id)
    expect(
      (
        await worker.fetch(`/api/repositories/${otherId}/ci/jobs/${job}`, {
          headers: charlie,
        })
      ).status,
    ).toBe(404)
    await worker.restart()
    expect(await value(receipt)).toEqual(result)
    const bad = stringColumn(
      await value(
        `${base}/commits`,
        request('ci_stage_bad_commit_1a', commit, 'trailing \n'),
      ),
      'id',
    )
    const badJob = stringColumn(
      await value(`${base}/ci/commits/${bad}`, {}, 202),
      'id',
    )
    const badReceipt = `${base}/ci/jobs/${badJob}/receipt`
    const latest = await worker.storage(`repo:${id}`)
    await expect
      .poll(
        async () =>
          (
            await latest.exec(
              'SELECT sequence FROM ci_stages WHERE job_id=?',
              badJob,
            )
          )[0]?.sequence,
      )
      .toBe(2)
    expect(await value(badReceipt)).toMatchObject({
      terminalState: 'failed',
      code: 'checks_failed',
    })
    expect(await value(receipt)).toEqual(result)
  } finally {
    await worker.close()
  }
}, 30000)
