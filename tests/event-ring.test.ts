import { expect, it } from 'vitest'
import { createEventRing } from '../src/domain/event-ring'

const metadata = {
  repositoryId: 'repo_abcdefghijklmnop',
  requestId: 'req_abcdefghijklmnop',
}
it('orders events, evicts oldest, and bounds retained event count', () => {
  const ring = createEventRing(2)
  ring.append({ ...metadata, kind: 'admitted' })
  ring.append({ ...metadata, kind: 'started' })
  for (let i = 0; i < 100; i++)
    ring.append({ ...metadata, kind: 'failed', reason: 'executor' })
  expect(ring.snapshot().map((event) => event.sequence)).toEqual([101, 102])
  expect(ring.inspect().occupancy).toBe(2)
})
it('copies only allowed metadata into immutable detached snapshots', () => {
  const ring = createEventRing(2)
  const input = {
    ...metadata,
    kind: 'admitted' as const,
    source: 'must not retain',
    token: 'secret',
  }
  ring.append(input)
  const snapshot = ring.snapshot()
  input.requestId = 'req_1234567890123456'
  expect(snapshot[0]).toEqual({ ...metadata, kind: 'admitted', sequence: 1 })
  expect(Object.isFrozen(snapshot)).toBe(true)
  expect(Object.isFrozen(snapshot[0])).toBe(true)
  expect(() => Object.assign(snapshot[0] ?? {}, { sequence: 0 })).toThrow()
  ring.append({ ...metadata, kind: 'started' })
  expect(snapshot.length).toBe(1)
})
it('explicitly stops diagnostics at safe-integer exhaustion without resetting order', () => {
  const ring = createEventRing(1, Number.MAX_SAFE_INTEGER - 1)
  expect(ring.append({ ...metadata, kind: 'admitted' }).kind).toBe('recorded')
  expect(ring.append({ ...metadata, kind: 'started' }).kind).toBe(
    'sequence-exhausted',
  )
  expect(ring.snapshot()[0]?.sequence).toBe(Number.MAX_SAFE_INTEGER)
  expect(ring.inspect().exhausted).toBe(true)
})
it('rejects unbounded metadata and invalid configuration without consuming sequence', () => {
  const ring = createEventRing(1)
  expect(
    ring.append({ ...metadata, kind: 'admitted', requestId: 'x'.repeat(10000) })
      .kind,
  ).toBe('invalid')
  expect(ring.inspect().sequence).toBe(0)
  for (const capacity of [0, -1, 257, 1.5])
    expect(() => createEventRing(capacity)).toThrow()
  expect(() => createEventRing(1, Number.MAX_SAFE_INTEGER + 1)).toThrow()
})
