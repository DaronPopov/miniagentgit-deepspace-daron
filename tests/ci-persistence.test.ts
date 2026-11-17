import { expect, it } from 'vitest'
import { ciFixture } from './ci-fixture'
import { request, unwrap } from './sqlite-fixture'
import { ciLimits } from '../src/application/ci/limits'
import { ciPipeline } from '../src/application/ci/pipelines'
import { validateSnapshot } from '../src/application/ci/validation'

it('persists queued acceptance and reuses the same immutable commit/fingerprint', async () => {
  const f = await ciFixture()
  try {
    const job = unwrap(await f.admit())
    expect(job.state).toBe('queued')
    expect(f.db.all('SELECT id,state FROM ci_jobs')).toEqual([
      { id: job.id, state: 'queued' },
    ])
    expect(unwrap(await f.admit())).toEqual(job)
    expect(f.db.all('SELECT * FROM ci_jobs')).toHaveLength(1)
    const changed = await ciPipeline(ciLimits({ lines: 184 }))
    expect(changed.fingerprint).not.toBe(f.pipeline.fingerprint)
    expect(unwrap(await f.admit(f.commit.id, changed)).id).not.toBe(job.id)
  } finally {
    await f.dispose()
  }
})
it('persists pass/fail receipts while leaving HEAD and immutable snapshots unchanged', async () => {
  const f = await ciFixture()
  try {
    const before = f.db.all('SELECT * FROM head')
    const job = unwrap(await f.admit())
    const claimed = unwrap(f.store.claim(f.context, f.pipeline))!
    const snapshot = unwrap(f.store.snapshot(f.context, claimed))
    unwrap(
      f.store.finish(
        f.context,
        claimed,
        await validateSnapshot(
          snapshot,
          f.limits,
          new AbortController().signal,
        ),
      ),
    )
    expect(unwrap(f.store.receipt(f.context, job.id))).toMatchObject({
      schemaVersion: 1,
      terminalState: 'passed',
      commitId: f.commit.id,
    })
    expect(f.db.all('SELECT * FROM head')).toEqual(before)
    const bad = unwrap(
      await f.authority.createCommit(
        f.context,
        request('ci_failed_commit_key', f.commit.id, 'bad '),
      ),
    )
    const failed = unwrap(await f.engine.request(f.context, bad.id))
    await f.engine.whenIdle()
    expect(unwrap(f.engine.receipt(f.context, failed.id))).toMatchObject({
      state: 'failed',
      terminalState: 'failed',
      code: 'checks_failed',
    })
    expect(
      unwrap(await f.authority.readFile(f.context, bad.id, 'src/a.txt')),
    ).toBe('bad ')
    expect(unwrap(await f.authority.readHead(f.context)).commitId).toBe(bad.id)
  } finally {
    await f.dispose()
  }
})
it('rejects invalid transitions and cannot overwrite a terminal receipt', async () => {
  const f = await ciFixture()
  try {
    const job = unwrap(await f.engine.request(f.context, f.commit.id))
    await f.engine.whenIdle()
    expect(() =>
      f.db.run("UPDATE ci_jobs SET state='running' WHERE id=?", job.id),
    ).toThrow(/invalid CI (transition|generation)/)
    expect(() => f.db.run('DELETE FROM ci_jobs')).toThrow(
      'durable CI retention',
    )
    expect(() =>
      f.db.run("UPDATE ci_receipts SET payload='{}' WHERE job_id=?", job.id),
    ).toThrow('immutable CI receipt')
    expect(unwrap(f.store.get(f.context, job.id)).state).toBe('passed')
  } finally {
    await f.dispose()
  }
})
it('enforces outstanding, retained record and storage reservation quotas without evicting replay', async () => {
  for (const overrides of [
    { outstanding: 1 },
    { storedJobs: 1 },
    { storedBytes: 9216 },
  ]) {
    const f = await ciFixture(overrides)
    try {
      const first = unwrap(await f.admit())
      const other = unwrap(
        await f.authority.createCommit(
          f.context,
          request('ci_capacity_commit', f.commit.id, 'second\n'),
        ),
      )
      expect(await f.admit(other.id)).toMatchObject({
        error: { code: 'QUOTA_EXCEEDED' },
      })
      expect(unwrap(await f.admit()).id).toBe(first.id)
      if (!('outstanding' in overrides)) {
        unwrap(f.store.stop(f.context, first.id, 'cancelled'))
        expect(await f.admit(other.id)).toMatchObject({
          error: { code: 'QUOTA_EXCEEDED' },
        })
      }
    } finally {
      await f.dispose()
    }
  }
})
it('authorizes inside CI storage and rejects nonexistent commits and invalid pages', async () => {
  const f = await ciFixture()
  try {
    const job = unwrap(await f.admit())
    const other = {
      ...f.context,
      actor: { kind: 'user' as const, subject: 'other' },
    }
    expect(f.store.get(other, job.id)).toMatchObject({
      error: { code: 'FORBIDDEN' },
    })
    expect(f.store.receipt(other, job.id)).toMatchObject({
      error: { code: 'FORBIDDEN' },
    })
    expect(await f.engine.request(f.context, 'bad')).toMatchObject({
      error: { code: 'INVALID_INPUT' },
    })
    expect(await f.admit('f'.repeat(64))).toMatchObject({
      error: { code: 'NOT_FOUND' },
    })
    expect(f.store.list(f.context, 0, 9)).toMatchObject({
      error: { code: 'INVALID_INPUT' },
    })
  } finally {
    await f.dispose()
  }
})
