import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { fixture, request, unwrap } from './sqlite-fixture'

it('persists metadata, HEAD, immutable data and replay after closing and reopening SQLite and owner services', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'miniagentgit-reopen-'))
  const path = join(directory, 'repository.sqlite')
  try {
    const first = await fixture({}, path)
    unwrap(await first.initialize())
    const committed = unwrap(
      await first.runtime.service.createCommit(first.context, request()),
    )
    first.close()
    const second = await fixture({}, path)
    try {
      expect(unwrap(await second.authority.readHead(second.context))).toEqual({
        commitId: committed.id,
        version: 1,
      })
      expect(
        unwrap(
          await second.authority.readFile(
            second.context,
            committed.id,
            'src/a.txt',
          ),
        ),
      ).toBe('hello')
      expect(
        unwrap(
          await second.runtime.service.createCommit(second.context, request()),
        ),
      ).toEqual(committed)
      expect(second.runtime.retainedPayloads()).toBe(0)
    } finally {
      second.close()
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
it('reports an unknown cancelled outcome while allowing the synchronous transaction to finish and replay', async () => {
  const controller = new AbortController()
  const f = await fixture({ beforeHead: () => controller.abort() })
  try {
    unwrap(await f.initialize())
    const result = await f.runtime.service.createCommit(
      f.context,
      request(),
      controller.signal,
    )
    expect(result).toMatchObject({ error: { code: 'UNAVAILABLE' } })
    const replay = unwrap(
      await f.authority.replay(f.context, 'commit_request_key_1'),
    )
    expect(unwrap(await f.authority.readHead(f.context))).toEqual({
      commitId: replay.id,
      version: 1,
    })
    expect(
      unwrap(await f.runtime.service.createCommit(f.context, request())),
    ).toEqual(replay)
    expect(f.runtime.retainedPayloads()).toBe(0)
    expect(f.runtime.scheduler.inspect().active).toBe(false)
  } finally {
    f.close()
  }
})
