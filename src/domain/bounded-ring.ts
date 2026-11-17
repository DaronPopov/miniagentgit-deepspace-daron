export const MAX_RING_CAPACITY = 1024
export type Dequeue<T> =
  | { readonly kind: 'empty' }
  | { readonly kind: 'item'; readonly value: T }
export interface BoundedRing<T> {
  readonly enqueue: (value: T) => { readonly kind: 'accepted' | 'full' }
  readonly dequeue: () => Dequeue<T>
  readonly remove: (value: T) => boolean
  readonly snapshot: () => readonly T[]
  readonly inspect: () => Readonly<{
    capacity: number
    head: number
    tail: number
    occupancy: number
  }>
}

/** One owning runtime; mutations are synchronous and never cross an await. */
export function createBoundedRing<T>(capacity: number): BoundedRing<T> {
  if (
    !Number.isSafeInteger(capacity) ||
    capacity < 1 ||
    capacity > MAX_RING_CAPACITY
  ) {
    throw new RangeError('Ring capacity must be an integer from 1 to 1024')
  }
  const slots: ({ readonly value: T } | undefined)[] = new Array(capacity)
  let head = 0,
    tail = 0,
    occupancy = 0
  const valueAt = (offset: number): T => {
    const slot = slots[(head + offset) % capacity]
    if (!slot) throw new Error('Ring occupancy invariant violated')
    return slot.value
  }
  return Object.freeze({
    enqueue(value: T) {
      if (occupancy === capacity) return { kind: 'full' as const }
      slots[tail] = { value }
      tail = (tail + 1) % capacity
      occupancy++
      return { kind: 'accepted' as const }
    },
    dequeue(): Dequeue<T> {
      if (occupancy === 0) return { kind: 'empty' }
      const value = valueAt(0)
      slots[head] = undefined
      head = (head + 1) % capacity
      occupancy--
      return { kind: 'item', value }
    },
    remove(value: T) {
      for (let i = 0; i < occupancy; i++) {
        if (!Object.is(valueAt(i), value)) continue
        for (let j = i; j < occupancy - 1; j++) {
          slots[(head + j) % capacity] = slots[(head + j + 1) % capacity]
        }
        tail = (tail + capacity - 1) % capacity
        slots[tail] = undefined
        occupancy--
        return true
      }
      return false
    },
    snapshot: () =>
      Object.freeze(Array.from({ length: occupancy }, (_, i) => valueAt(i))),
    inspect: () => Object.freeze({ capacity, head, tail, occupancy }),
  })
}
