import { expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { identityFixture } from './identity-fixture'
import { workerFixture } from './worker-fixture'
import { creation } from './sqlite-fixture'

it('restores a stopped workerd snapshot into a fresh runtime with exact repository and receipt bytes', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'miniagentgit-backup-'))
  const snapshot = join(directory, 'objects')
  const keys = await identityFixture()
  const runtime = await workerFixture(keys.env, true)
  const headers = {
    authorization: 'Bearer ' + (await keys.token()),
    'content-type': 'application/json',
  }
  const foreign = { authorization: 'Bearer ' + (await keys.token('other')) }
  let restored: Awaited<ReturnType<typeof workerFixture>> | undefined
  function send(path: string, body?: unknown) {
    return runtime.fetch(path, {
      headers,
      ...(body === undefined
        ? {}
        : { method: 'POST', body: JSON.stringify(body) }),
    })
  }
  async function write(path: string, body: unknown, status = 200) {
    const response = await send(path, body)
    expect(response.status).toBe(status)
    const payload: unknown = await response.json()
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('value' in payload) ||
      !payload.value ||
      typeof payload.value !== 'object' ||
      !('id' in payload.value) ||
      typeof payload.value.id !== 'string'
    )
      throw new Error('Missing durable identity')
    return payload.value.id
  }
  async function settled(path: string, terminalState: string) {
    for (let n = 0; n < 45; n++) {
      const response = await send(path)
      if (response.status === 200) {
        expect(await response.json()).toMatchObject({
          value: { terminalState },
        })
        return
      }
      expect(response.status).toBe(409)
      await setTimeout(50)
    }
    throw new Error('CI fixture did not settle within its bounded window')
  }
  async function digest(target: typeof runtime, paths: readonly string[]) {
    const hash = createHash('sha256')
    for (const path of paths) {
      const response = await target.fetch(path, { headers })
      expect(response.status).toBe(200)
      hash.update(JSON.stringify([path, await response.text()]))
    }
    return hash.digest('hex')
  }
  try {
    const repository = await write('/api/repositories', creation)
    const base = '/api/repositories/' + repository
    const commitRequest = (
      expectedHead: string | null,
      idempotencyKey: string,
      path: string,
      text: string,
    ) => ({
      expectedHead,
      idempotencyKey,
      message: 'Snapshot recovery',
      changes: [{ kind: 'put', path, text }],
    })
    const broken = commitRequest(
      null,
      'backup-broken-commit',
      'src/main.ts',
      'import { value } from "./dep";\nexport const result = value;\n',
    )
    const first = await write(base + '/commits', broken)
    const ciStart = performance.now()
    const firstJob = await write(base + '/ci/commits/' + first, {}, 202)
    const fixed = commitRequest(
      first,
      'backup-fixed-commit',
      'src/dep.ts',
      'export const value = 42;\n',
    )
    const second = await write(base + '/commits', fixed)
    const secondJob = await write(base + '/ci/commits/' + second, {}, 202)
    const receipts = [firstJob, secondJob].map(
      (job) => base + '/ci/jobs/' + job + '/receipt',
    )
    await settled(receipts[0]!, 'failed')
    await settled(receipts[1]!, 'passed')
    const ciFixtureMs = Math.round(performance.now() - ciStart)
    const paths = [
      base,
      base + '/head',
      base + '/idempotency/' + broken.idempotencyKey,
      ...[first, second].flatMap((commit) => [
        base + '/commits/' + commit,
        base + '/tree?commit=' + commit,
        base + '/files/' + commit + '?path=src%2Fmain.ts',
      ]),
      base + '/files/' + second + '?path=src%2Fdep.ts',
      ...receipts,
    ]
    const before = await digest(runtime, paths)
    const start = performance.now()
    await runtime.backup(snapshot)
    expect(await digest(runtime, paths)).toBe(before)
    restored = await workerFixture(keys.env, true, snapshot)
    const after = await digest(restored, paths)
    expect(after).toBe(before)
    expect(
      (await restored.fetch(receipts[1]!, { headers: foreign })).status,
    ).toBe(403)
    const replay = await restored.fetch(base + '/commits', {
      method: 'POST',
      headers,
      body: JSON.stringify(broken),
    })
    expect(replay.status).toBe(200)
    expect(await replay.json()).toMatchObject({ value: { id: first } })
    expect(await digest(restored, paths)).toBe(before)
    console.log(
      JSON.stringify({
        responseDigest: before,
        ciFixtureMs,
        responses: paths.length,
        backupRestartAndRestoreMs: Math.round(performance.now() - start),
      }),
    )
  } finally {
    await restored?.close()
    await runtime.close()
    rmSync(directory, { recursive: true, force: true })
  }
}, 20_000)
