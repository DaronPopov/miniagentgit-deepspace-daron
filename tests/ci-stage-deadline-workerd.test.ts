import { expect, it } from 'vitest'
import { ciWorkerClient } from './ci-worker-client'
import { creation, request } from './sqlite-fixture'
import { stringColumn } from '../src/server/storage/database'
import { stageBounds } from '../src/application/ci/stages'

it.skipIf(process.env.CI_VERIFY_STAGE_DEADLINE !== '1')(
  'expires an orphaned job through its repository alarm without owner polling',
  async () => {
    const { worker, value } = await ciWorkerClient()
    try {
      const repo = stringColumn(
        await value('/api/repositories', creation),
        'id',
      )
      const base = `/api/repositories/${repo}`
      const commit = stringColumn(
        await value(`${base}/commits`, request()),
        'id',
      )
      const job = stringColumn(
        await value(`${base}/ci/commits/${commit}`, {}, 202),
        'id',
      )
      const storage = await worker.storage(`repo:${repo}`)
      await expect
        .poll(
          async () =>
            (
              await storage.exec(
                'SELECT ordinal FROM ci_stages WHERE job_id=?',
                job,
              )
            )[0]?.ordinal,
          { interval: 5 },
        )
        .toBe(1)
      // Fence the live scheduling row while leaving the admitted deadline and alarm.
      await storage.exec(
        "UPDATE ci_jobs SET generation=generation+1, attempts=attempts+1 WHERE id=? AND state='running'",
        job,
      )
      expect(
        (
          await storage.exec(
            'SELECT generation,state FROM ci_jobs WHERE id=?',
            job,
          )
        )[0],
      ).toEqual({ generation: 2, state: 'running' })
      await new Promise((resolve) =>
        setTimeout(resolve, stageBounds.elapsedMs + 600),
      )
      expect(
        (
          await storage.exec('SELECT state,code FROM ci_jobs WHERE id=?', job)
        )[0],
      ).toEqual({ state: 'expired', code: 'deadline' })
      expect(
        (
          await storage.exec(
            'SELECT ordinal FROM ci_stages WHERE job_id=?',
            job,
          )
        )[0]?.ordinal,
      ).toBe(1)
    } finally {
      await worker.close()
    }
  },
  40000,
)
