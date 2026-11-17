import { expect, it } from 'vitest'
import { ciWorkerClient } from './ci-worker-client'
import { creation, request } from './sqlite-fixture'
import { stringColumn } from '../src/server/storage/database'

it('writes fixed terminal diagnostics for syntax, lint and import failures in workerd', async () => {
  const { worker, value } = await ciWorkerClient()
  try {
    const repo = stringColumn(await value('/api/repositories', creation), 'id')
    const base = `/api/repositories/${repo}`
    const storage = await worker.storage(`repo:${repo}`)
    let head: string | null = null
    for (const [index, stage, code, text] of [
      [3, 'syntax', 'invalid_syntax', 'const token_should_not_leak = ;\n'],
      [4, 'lint', 'debugger_statement', 'debugger;\n'],
      [5, 'imports', 'missing_import', 'import "./token_should_not_leak";\n'],
    ] as const) {
      const path = 'src/file.ts'
      head = stringColumn(
        await value(`${base}/commits`, {
          ...request(`ci_workerd_analysis_${index}`, head),
          changes: [{ kind: 'put', path, text }],
        }),
        'id',
      )
      const job = stringColumn(
        await value(`${base}/ci/commits/${head}`, {}, 202),
        'id',
      )
      await expect
        .poll(
          async () =>
            (
              await storage.exec(
                'SELECT ordinal FROM ci_stages WHERE job_id=?',
                job,
              )
            )[0]?.ordinal,
        )
        .toBe(index)
      const receipt = await value(`${base}/ci/jobs/${job}/receipt`)
      expect(receipt).toMatchObject({
        terminalState: 'failed',
        checks: { [stage]: 'failed', typescript: 'deferred' },
        diagnostics: [{ path, check: stage, code, line: 1 }],
      })
      expect(JSON.stringify(receipt)).not.toContain('token_should_not_leak')
    }
  } finally {
    await worker.close()
  }
}, 30000)
