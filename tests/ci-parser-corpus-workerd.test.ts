import { expect, it } from 'vitest'
import { corpus } from '../scripts/parser-qualification/corpus.mjs'
import { ciWorkerClient } from './ci-worker-client'
import { creation, request } from './sqlite-fixture'
import { numberColumn, stringColumn } from '../src/server/storage/database'
import { objectValue } from '../src/domain/validation'

const workLimited = new Set([
  'dense-arrays',
  'operators',
  'stack-parentheses',
  'mixed-containers',
  'functions',
  'templates',
  'generics',
  'conditional-types',
  'tuple-union',
  'type-assertions',
  'jsx-nesting',
  'tsx-nested',
  'excessive-imports',
])
const policyFailures = new Set([
  'typed-modules',
  'maximum-imports',
  'mixed-imports',
  'long-import',
])

it.skipIf(process.env.CI_VERIFY_PARSER_CORPUS !== '1')(
  'qualifies the bounded corpus through real workerd CI alarms',
  async () => {
    const { worker, value } = await ciWorkerClient()
    try {
      for (let offset = 0; offset < corpus.length; offset += 16) {
        const repo = stringColumn(
          await value('/api/repositories', {
            ...creation,
            idempotencyKey: `parser_corpus_repo_${offset}`,
          }),
          'id',
        )
        const base = `/api/repositories/${repo}`
        const storage = await worker.storage(`repo:${repo}`)
        let head: string | null = null
        let previousPath: string | undefined
        for (const [index, fixture] of corpus
          .slice(offset, offset + 16)
          .entries()) {
          const path = 'input' + fixture.extension
          const result = await value(`${base}/commits`, {
            ...request(`ci_parser_fixture_${index}`, head),
            changes: [
              ...(previousPath && previousPath !== path
                ? [{ kind: 'delete', path: previousPath }]
                : []),
              { kind: 'put', path, text: fixture.text },
            ],
          })
          head = stringColumn(result, 'id')
          previousPath = path
          const job = stringColumn(
            await value(`${base}/ci/commits/${head}`, {}, 202),
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
              { timeout: 5000 },
            )
            .toBe(1)
          const receipt = await value(`${base}/ci/jobs/${job}/receipt`)
          const code = stringColumn(receipt, 'code')
          const outcome = stringColumn(receipt, 'terminalState')
          const expected = workLimited.has(fixture.name)
            ? 'work_limit'
            : policyFailures.has(fixture.name) ||
                fixture.outcomes.includes('syntax')
              ? 'checks_failed'
              : 'none'
          // V8 stack headroom is runtime specific for this threshold sample.
          expect(
            fixture.name === 'parentheses-500'
              ? ['none', 'work_limit']
              : [expected],
          ).toContain(code)
          expect(outcome).toBe(code === 'none' ? 'passed' : 'failed')
          const cursor = (
            await storage.exec(
              'SELECT stage_timings FROM ci_stages WHERE job_id=?',
              job,
            )
          )[0]
          const timings: unknown = JSON.parse(String(cursor?.stage_timings))
          expect(objectValue(timings)).toBe(true)
          expect(receipt.commitId).toBe(head)
          expect(receipt.work).toBeLessThanOrEqual(512 * 1024)
          expect(await value(`${base}/head`)).toMatchObject({ commitId: head })
          process.stdout.write(
            JSON.stringify({
              fixture: fixture.name,
              bytes: Buffer.byteLength(fixture.text),
              code,
              outcome,
              work: numberColumn(receipt, 'work'),
              timings,
            }) + '\n',
          )
        }
      }
    } finally {
      await worker.close()
    }
  },
  60000,
)
