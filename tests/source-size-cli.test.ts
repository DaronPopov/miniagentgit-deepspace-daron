import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, it } from 'vitest'

it('checks tracked files, ignores untracked files, and exits nonzero on violations', () => {
  const directory = mkdtempSync(join(tmpdir(), 'miniagentgit-size-'))
  const checker = resolve('scripts/check-source-size.mjs')
  try {
    execFileSync('git', ['init', '--quiet'], { cwd: directory })
    mkdirSync(join(directory, 'src/server'), { recursive: true })
    mkdirSync(join(directory, 'tests'))
    writeFileSync(join(directory, 'domain.ts'), '\n'.repeat(185))
    writeFileSync(join(directory, 'src/server/api.ts'), '\n'.repeat(300))
    writeFileSync(join(directory, 'tests/adapter.test.ts'), '\n'.repeat(185))
    writeFileSync(join(directory, 'untracked.ts'), '\n'.repeat(999))
    execFileSync('git', ['add', 'domain.ts', 'src', 'tests'], {
      cwd: directory,
    })
    const run = () =>
      spawnSync(process.execPath, [checker], {
        cwd: directory,
        encoding: 'utf8',
      })
    expect(run().status).toBe(0)
    writeFileSync(join(directory, 'domain.ts'), '\n'.repeat(186))
    writeFileSync(join(directory, 'src/server/api.ts'), '\n'.repeat(301))
    writeFileSync(join(directory, 'tests/adapter.test.ts'), '\n'.repeat(186))
    const failed = run()
    expect(failed.status).toBe(1)
    expect(failed.stdout).toContain('FAIL domain.ts: 186 lines (maximum 185)')
    expect(failed.stdout).toContain(
      'FAIL src/server/api.ts: 301 lines (maximum 300)',
    )
    expect(failed.stdout).toContain(
      'FAIL tests/adapter.test.ts: 186 lines (maximum 185)',
    )
    expect(failed.stdout).not.toContain('untracked.ts')
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
