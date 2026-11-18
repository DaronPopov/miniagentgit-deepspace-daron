// Populate only the disposable local runtime through its real authenticated API.
import assert from 'node:assert/strict'
import { setTimeout } from 'node:timers/promises'

export async function seedRepositories(worker, tokens) {
  async function request(path, token = tokens.own, body) {
    const response = await worker.dispatchFetch('http://localhost' + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        authorization: 'Bearer ' + token,
        'content-type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: response.status, payload: await response.json() }
  }
  async function write(path, body, token = tokens.own, status = 200) {
    const result = await request(path, token, body)
    assert.equal(result.status, status, path)
    assert.equal(result.payload.ok, true, path)
    return result.payload.value
  }
  async function create(name, key, token) {
    return (
      await write('/api/repositories', { name, idempotencyKey: key }, token)
    ).id
  }
  const empty = await create('Empty workspace', 'browser-empty-repository')
  const foreign = await create(
    'Foreign workspace',
    'browser-foreign-repository',
    tokens.foreign,
  )
  const populated = await create(
    'Browser inspection workspace',
    'browser-populated-repository',
  )
  const base = '/api/repositories/' + populated
  let last = null
  async function commit(message, changes, ordinal) {
    const result = await write(base + '/commits', {
      expectedHead: last,
      message,
      changes,
      idempotencyKey: 'browser-fixture-commit-' + ordinal,
    })
    last = result.id
    return last
  }
  const put = (path, text) => ({ kind: 'put', path, text })
  async function validate(commitId, terminal) {
    const job = await write(
      base + '/ci/commits/' + commitId,
      {},
      tokens.own,
      202,
    )
    const path = base + '/ci/jobs/' + job.id + '/receipt'
    let pending
    for (let attempt = 0; attempt < 50; attempt++) {
      const result = await request(path)
      if (result.status === 200) {
        assert.equal(result.payload.value.terminalState, terminal)
        return { job: job.id, pending }
      }
      assert.equal(result.status, 409, path)
      pending ??= result.payload
      await setTimeout(55)
    }
    throw new Error('Browser CI fixture did not reach terminal state')
  }
  for (let ordinal = 1; ordinal <= 3; ordinal++) {
    const checkpoint = await commit(
      'Preparation ' + ordinal,
      [put('notes.txt', 'Version ' + ordinal + '\n')],
      ordinal,
    )
    await validate(checkpoint, 'passed')
  }
  const bad = await commit(
    'Initial snapshot with unresolved import',
    [
      put(
        'src/main.ts',
        'import { x } from "./dep";\nexport const output = x;\n',
      ),
      put('notes.txt', '<b>literal text</b>\n'),
      ...Array.from({ length: 11 }, (_, n) =>
        put('doc-' + n + '.txt', 'Committed text\n'),
      ),
    ],
    4,
  )
  const failed = await validate(bad, 'failed')
  const good = await commit(
    'Resolve the local import',
    [put('src/dep.ts', 'export const x = 1;\n')],
    5,
  )
  const passed = await validate(good, 'passed')
  assert.equal(failed.pending?.error.code, 'CONFLICT')
  return {
    empty,
    foreign,
    populated,
    bad,
    good,
    failed: failed.job,
    passed: passed.job,
    pending: failed.pending,
  }
}
