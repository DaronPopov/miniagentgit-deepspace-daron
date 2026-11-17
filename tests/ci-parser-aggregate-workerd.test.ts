import { expect, it } from 'vitest'
import { aggregateDense } from '../scripts/parser-qualification/corpus.mjs'
import { ciWorkerClient } from './ci-worker-client'
import { creation, request } from './sqlite-fixture'
import { stringColumn } from '../src/server/storage/database'

it.skipIf(process.env.CI_VERIFY_PARSER_CORPUS !== '1')(
  'measures all three parse stages at the aggregate byte cap with dense ASTs',
  async () => {
    const { worker, value } = await ciWorkerClient()
    try {
      const repo = stringColumn(
        await value('/api/repositories', creation),
        'id',
      )
      const base = `/api/repositories/${repo}`
      const storage = await worker.storage(`repo:${repo}`)
      const commit = stringColumn(
        await value(`${base}/commits`, {
          ...request('parser_dense_aggregate_commit'),
          changes: aggregateDense.map((file) => ({ kind: 'put', ...file })),
        }),
        'id',
      )
      const job = stringColumn(
        await value(`${base}/ci/commits/${commit}`, {}, 202),
        'id',
      )
      await expect
        .poll(
          async () =>
            (
              await storage.exec(
                'SELECT 1 FROM ci_receipts WHERE job_id=?',
                job,
              )
            ).length,
        )
        .toBe(1)
      const receipt = await value(`${base}/ci/jobs/${job}/receipt`)
      expect(receipt).toMatchObject({
        bytes: 128 * 1024,
        files: 4,
        terminalState: 'passed',
      })
      expect(receipt.work).toBeLessThanOrEqual(512 * 1024)
      const row = (
        await storage.exec(
          'SELECT stage_timings FROM ci_stages WHERE job_id=?',
          job,
        )
      )[0]
      process.stdout.write(
        JSON.stringify({
          fixture: 'aggregate-dense',
          bytes: receipt.bytes,
          work: receipt.work,
          code: receipt.code,
          outcome: receipt.terminalState,
          timings: JSON.parse(String(row?.stage_timings)),
        }) + '\n',
      )
    } finally {
      await worker.close()
    }
  },
  15000,
)
