import { describe, expect, it } from 'vitest'
// The checker is executable JavaScript; this declaration describes its public helpers.
import {
  checkFiles,
  permittedLines,
  physicalLines,
} from '../scripts/check-source-size.mjs'

describe('tracked source size policy', () => {
  it('classifies integrations explicitly and gives tests the smaller limit', () => {
    expect(permittedLines('src/application/commit.ts')).toBe(185)
    expect(permittedLines('src/server/api/health.ts')).toBe(300)
    expect(permittedLines('worker.ts')).toBe(300)
    expect(permittedLines('src/server/storage/authority.ts')).toBe(185)
    expect(permittedLines('src/server/business.ts')).toBe(185)
    expect(permittedLines('src/server/api/unclassified.ts')).toBe(185)
    expect(permittedLines('src/server/api/health.test.ts')).toBe(185)
    expect(permittedLines('tests/large.ts')).toBe(185)
    expect(permittedLines('src/router.ts')).toBeUndefined()
    expect(permittedLines('vendor/library.ts')).toBeUndefined()
    expect(permittedLines('src/new-generated.ts')).toBe(185)
  })

  it('counts blank lines, comments, CRLF, and unterminated last lines', () => {
    expect(physicalLines('')).toBe(0)
    expect(physicalLines('\n')).toBe(1)
    expect(physicalLines('// comment\r\n\r\ncode')).toBe(3)
    expect(physicalLines('code\n')).toBe(1)
  })

  it('reports exact limits at and above the boundary in stable path order', () => {
    const results = checkFiles(['b.ts', 'a.ts'], (path: string) =>
      'x\n'.repeat(path === 'a.ts' ? 185 : 186),
    )
    expect(results).toEqual([
      { path: 'a.ts', actual: 185, maximum: 185 },
      { path: 'b.ts', actual: 186, maximum: 185 },
    ])
  })
})
