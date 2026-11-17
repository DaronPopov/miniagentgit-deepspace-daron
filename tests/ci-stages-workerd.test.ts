import { expect, it } from 'vitest'
import { ciWorkerClient } from './ci-worker-client'
import { creation, request } from './sqlite-fixture'
import { objectValue } from '../src/domain/validation'
import { stringColumn } from '../src/server/storage/database'

it('runs integrity and source policy through actual JobRoom alarms', async () => {
  const { identity, worker, headers, value } = await ciWorkerClient()
  try {
    const id = stringColumn(await value('/api/repositories', creation), 'id')
    const base = `/api/repositories/${id}`
    const commit = stringColumn(
      await value(`${base}/commits`, {
        ...request('ci_stage_valid_1'),
        changes: [
          {
            kind: 'put',
            path: 'src/entry.tsx',
            text: 'import "./dep"; export const x: unknown = <b/>; throw Error("submitted");\n',
          },
          {
            kind: 'put',
            path: 'src/dep.jsx',
            text: 'export const x = <span/>;\n',
          },
        ],
      }),
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
    for (
      let ordinal = 1;
      process.env.CI_VERIFY_STAGE_RESTART === '1' && ordinal <= 4;
      ordinal++
    ) {
      await expect
        .poll(
          async () => {
            const rows = await storage.exec(
              'SELECT ordinal FROM ci_stages WHERE job_id=?',
              job,
            )
            return rows[0]?.ordinal
          },
          { interval: 5, timeout: 5000 },
        )
        .toBe(ordinal)
      await worker.restart()
      storage = await worker.storage(`repo:${id}`)
    }
    await expect
      .poll(
        async () => {
          const rows = await storage.exec(
            'SELECT ordinal FROM ci_stages WHERE job_id=?',
            job,
          )
          return rows[0]?.ordinal
        },
        { timeout: 5000 },
      )
      .toBe(5)
    const result = await value(receipt)
    expect(result).toMatchObject({
      terminalState: 'passed',
      generation: 1,
      pipeline: { version: 3 },
      schemaVersion: 2,
      checks: {
        manifest: 'passed',
        source: 'passed',
        syntax: 'passed',
        lint: 'passed',
        imports: 'passed',
        typescript: 'deferred',
      },
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
              'SELECT ordinal FROM ci_stages WHERE job_id=?',
              badJob,
            )
          )[0]?.ordinal,
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
