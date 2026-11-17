import { describe, expect, it } from 'vitest'
import { createBoundedRing } from '../src/domain/bounded-ring'

describe('bounded FIFO ring', () => {
  it('has typed empty dequeue and rejects invalid capacities', () => {
    expect(createBoundedRing(2).dequeue()).toEqual({ kind: 'empty' })
    for (const capacity of [0, -1, 1.1, NaN, Infinity, 1025]) {
      expect(() => createBoundedRing(capacity)).toThrow(RangeError)
    }
  })
  it('supports capacity one without overwriting even an undefined value', () => {
    const ring = createBoundedRing<undefined | number>(1)
    expect(ring.enqueue(undefined).kind).toBe('accepted')
    expect(ring.enqueue(2).kind).toBe('full')
    expect(ring.dequeue()).toEqual({ kind: 'item', value: undefined })
    expect(ring.dequeue().kind).toBe('empty')
    expect(ring.inspect()).toEqual({
      capacity: 1,
      head: 0,
      tail: 0,
      occupancy: 0,
    })
  })
  it('preserves FIFO through wraparound and repeated drain/refill', () => {
    const ring = createBoundedRing<number>(3)
    for (let round = 0; round < 100; round++) {
      for (let i = 0; i < 3; i++)
        expect(ring.enqueue(round * 3 + i).kind).toBe('accepted')
      expect(ring.enqueue(-1).kind).toBe('full')
      for (let i = 0; i < 3; i++)
        expect(ring.dequeue()).toEqual({ kind: 'item', value: round * 3 + i })
    }
    ring.enqueue(1)
    ring.enqueue(2)
    expect(ring.dequeue()).toEqual({ kind: 'item', value: 1 })
    ring.enqueue(3)
    ring.enqueue(4)
    expect(ring.snapshot()).toEqual([2, 3, 4])
    expect(ring.inspect().occupancy).toBe(3)
  })
  it('removes cancelled entries without tombstones or disturbing FIFO', () => {
    const ring = createBoundedRing<number>(3)
    ring.enqueue(0)
    ring.enqueue(1)
    ring.enqueue(2)
    ring.dequeue()
    ring.enqueue(3)
    expect(ring.remove(2)).toBe(true)
    expect(ring.remove(8)).toBe(false)
    expect(ring.enqueue(4).kind).toBe('accepted')
    expect(ring.snapshot()).toEqual([1, 3, 4])
    expect(Object.isFrozen(ring.snapshot())).toBe(true)
  })
})
