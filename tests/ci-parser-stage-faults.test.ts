import { expect, it, vi } from 'vitest'
import * as parser from '../src/application/ci/analysis-parser'
import { ciFixture } from './ci-fixture'
import { request, unwrap } from './sqlite-fixture'
import { ciJobIdentity, ciPipeline } from '../src/application/ci/pipelines'
import { stageBounds } from '../src/application/ci/stages'
import { reserveDispatch } from '../src/server/storage/ci/dispatch'
import { runStage } from '../src/server/storage/ci/stages'
import { createCiStore } from '../src/server/storage/ci/store'

async function ready() {
  const f = await ciFixture()
  const commit = unwrap(
    await f.authority.createCommit(f.context, {
      ...request('ci_parser_fault_fixture', f.commit.id),
      changes: [
        { kind: 'put', path: 'input.js', text: 'export const x = 1;\n' },
      ],
    }),
  )
  const pipeline = await ciPipeline(f.limits, true)
  const id = await ciJobIdentity(f.id, commit.id, pipeline)
  let elapsed = 0
  const now = () => f.now() + elapsed
  const store = createCiStore(f.db, f.id, f.limits, now, true)
  unwrap(store.admit(f.context, commit.id, pipeline, id))
  const dispatch = reserveDispatch(f.db, id, now())
  if (!dispatch) throw new Error('Missing dispatch')
  const run = () => runStage(f.db, dispatch, now)
  expect(await run()).toBe('continue')
  expect(await run()).toBe('continue')
  return {
    ...f,
    id,
    run,
    commit,
    store,
    read: () => unwrap(store.receipt(f.context, id)),
    cursor: () =>
      f.db.all(
        'SELECT ordinal,checkpoint FROM ci_stages WHERE job_id=?',
        id,
      )[0],
    tick: (ms: number) => {
      elapsed += ms
    },
  }
}

it.each(['expired', 'cancelled', 'stale'] as const)(
  'fences a parsed result after an injected %s transition during the invocation',
  async (scenario) => {
    const f = await ready()
    const before = f.cursor()
    const real = parser.parseSource
    const parse = vi
      .spyOn(parser, 'parseSource')
      .mockImplementationOnce((text, extension) => {
        const ast = real(text, extension)
        // Inject the interleaving deterministically. A JS timer cannot execute here.
        if (scenario === 'expired') f.tick(stageBounds.stageMs)
        if (scenario === 'cancelled')
          unwrap(f.store.stop(f.context, f.id, 'cancelled'))
        if (scenario === 'stale') {
          f.tick(stageBounds.dispatchLeaseMs)
          expect(
            reserveDispatch(f.db, f.id, f.now() + stageBounds.dispatchLeaseMs)
              ?.generation,
          ).toBe(2)
        }
        return ast
      })
    try {
      expect(await f.run()).toBe(scenario === 'expired' ? 'done' : 'stale')
      expect(f.cursor()?.ordinal).toBe(before?.ordinal)
      if (scenario === 'stale') {
        expect(f.store.receipt(f.context, f.id).ok).toBe(false)
      } else {
        expect(f.cursor()).toEqual(before)
        expect(f.read()).toMatchObject({
          terminalState: scenario,
          checks: { syntax: 'skipped' },
        })
        const receipt = f.read()
        expect(await f.run()).toBe('stale')
        expect(f.read()).toEqual(receipt)
      }
    } finally {
      parse.mockRestore()
      await f.dispose()
    }
  },
)
