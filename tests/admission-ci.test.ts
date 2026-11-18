import { expect, it } from 'vitest'
import { admissionRoom, limits } from '../src/server/admission/ledger'
import { tenantFixture } from './tenant-fixture'
import { stringColumn } from '../src/server/storage/database'

it('bounds CI attempts across HTTP and the native tool before allocating jobs', async () => {
  const f = await tenantFixture()
  try {
    const repository = await f.create('Alice', 'admission_ci_repo_1')
    const base = '/api/repositories/' + repository.id
    const commit = stringColumn(
      await f.commit('Alice', base, 'admission_ci_commit_1'),
      'id',
    )
    const ledger = await f.storage(admissionRoom)
    // A future bucket supplies a stable clock boundary to the local fixture.
    await ledger.exec(
      'INSERT INTO admission_windows VALUES (?, ?, 0)',
      'ci',
      Math.floor(Date.now() / 60_000) + 1,
    )
    const path = base + '/ci/commits/' + commit
    for (let n = 0; n < limits.ci; n++) {
      expect(
        (await f.response('Alice', path, { pipelineId: 'invalid' })).status,
      ).toBe(400)
    }
    const result = await f.response(
      'Alice',
      '/_deepspace/agent/tools/miniagentgit.ci_request',
      {
        input: { repositoryId: repository.id, commitId: commit },
      },
    )
    expect(result.status).toBe(429)
    const owner = await f.storage('repo:' + repository.id)
    expect(await owner.exec('SELECT id FROM ci_jobs')).toEqual([])
  } finally {
    await f.close()
  }
})
