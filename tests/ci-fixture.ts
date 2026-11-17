import { fixture, request, unwrap } from './sqlite-fixture'
import { ciLimits } from '../src/application/ci/limits'
import type { CiLimits } from '../src/application/ci/limits'
import { ciJobIdentity, ciPipeline } from '../src/application/ci/pipelines'
import { createCiStore } from '../src/server/storage/ci/store'
import { createCiEngine } from '../src/application/ci/service'
import type { CiEngineOptions } from '../src/application/ci/service'
import { prepareCommit } from '../src/application/prepare-commit'
import type { CiSnapshot } from '../src/contracts/ci'

export async function ciFixture(
  overrides: Partial<CiLimits> = {},
  engineOptions: Partial<Pick<CiEngineOptions, 'validate' | 'retain'>> = {},
  path?: string,
) {
  const f = await fixture({}, path)
  unwrap(await f.initialize())
  const commit = unwrap(
    await f.authority.createCommit(
      f.context,
      request('ci_fixture_commit_key', null, 'hello\n'),
    ),
  )
  const limits = ciLimits(overrides),
    pipeline = await ciPipeline(limits)
  let time = 1000
  const timers = new Set<() => void>()
  const now = () => time
  const store = createCiStore(f.db, f.id, limits, now)
  const scheduler = {
    now,
    schedule: (_ms: number, callback: () => void) => {
      timers.add(callback)
      return () => {
        timers.delete(callback)
      }
    },
  }
  const engine = createCiEngine({
    store,
    limits,
    ...scheduler,
    ...engineOptions,
  })
  return {
    ...f,
    commit,
    limits,
    pipeline,
    store,
    engine,
    now,
    advance: (ms: number) => {
      time += ms
    },
    fireTimers: () => {
      for (const timer of [...timers]) timer()
    },
    admit: async (commitId = commit.id, definition = pipeline) =>
      store.admit(
        f.context,
        commitId,
        definition,
        await ciJobIdentity(f.id, commitId, definition),
      ),
    newEngine: () => createCiEngine({ store, limits, ...scheduler }),
    dispose: async () => {
      await engine.whenIdle()
      f.close()
    },
  }
}
export async function validSnapshot(
  text = 'hello\n',
  path = 'a.ts',
): Promise<CiSnapshot> {
  const f = await fixture()
  try {
    const prepared = await prepareCommit(
      f.id,
      f.context.actor,
      { ...request(), changes: [{ kind: 'put', path, text }] },
      [],
      'fixed',
    )
    return {
      repositoryId: f.id,
      commitId: prepared.metadata.id,
      manifestHash: prepared.manifestHash,
      canonicalCommit: prepared.canonical,
      entries: prepared.manifest.map((entry) => ({
        path: entry.path,
        hash: entry.contentHash,
        bytes: entry.utf8Bytes,
        content: text,
      })),
    }
  } finally {
    f.close()
  }
}
