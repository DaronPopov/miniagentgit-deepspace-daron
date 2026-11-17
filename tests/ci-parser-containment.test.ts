import { expect, it, vi } from 'vitest'
import * as parser from '../src/application/ci/analysis-parser'
import { analyzeSnapshot } from '../src/application/ci/analysis'
import { ciLimits } from '../src/application/ci/limits'
import { failedValidation } from '../src/application/ci/validation'
import { corpus } from '../scripts/parser-qualification/corpus.mjs'
import type { CiSnapshot } from '../src/contracts/ci'

function snapshot(text: string, extension = '.js'): CiSnapshot {
  return {
    repositoryId: '',
    commitId: '',
    manifestHash: null,
    canonicalCommit: '',
    entries: [
      {
        path: 'input' + extension,
        hash: '',
        content: text,
        bytes: Buffer.byteLength(text),
      },
    ],
  }
}

const validate = (input: CiSnapshot, signal = new AbortController().signal) =>
  analyzeSnapshot('syntax', input, ciLimits(), failedValidation('none'), signal)

it('never calls the parser for an already aborted stage', () => {
  const parse = vi.spyOn(parser, 'parseSource')
  try {
    const controller = new AbortController()
    controller.abort()
    expect(validate(snapshot('const a = 0'), controller.signal).code).toBe(
      'cancelled',
    )
    expect(parse).not.toHaveBeenCalled()
  } finally {
    parse.mockRestore()
  }
})

it.each([
  [new RangeError('synthetic recursion details'), 'work_limit'],
  [new Error('synthetic credential details'), 'validator_exception'],
] as const)(
  'normalizes parser exceptions without leaking details',
  (error, code) => {
    const parse = vi.spyOn(parser, 'parseSource').mockImplementationOnce(() => {
      throw error
    })
    try {
      const result = validate(snapshot('const a = 0'))
      expect(result).toMatchObject({ code, state: 'failed', diagnostics: [] })
      expect(JSON.stringify(result)).not.toContain(error.message)
    } finally {
      parse.mockRestore()
    }
  },
)

it('bounds AST traversal after dense allocation and keeps valid delimiter literals', () => {
  const dense = corpus.find((value) => value.name === 'dense-arrays')
  const literal = corpus.find((value) => value.name === 'literal-delimiters')
  if (!dense || !literal) throw new Error('Missing parser fixtures')
  expect(validate(snapshot(dense.text)).code).toBe('work_limit')
  expect(validate(snapshot(literal.text)).state).toBe('passed')
})

it('ignores parser metadata and bounds recursion through typed child nodes', () => {
  const visits: string[] = []
  expect(
    parser.traverseAst(
      {
        type: 'Program',
        loc: { type: 'Metadata' },
        extra: { type: 'Metadata' },
        body: [{ type: 'ImportDeclaration' }, { type: 'DebuggerStatement' }],
      },
      (node) => {
        visits.push(node.type)
        return true
      },
    ),
  ).toBe(true)
  expect(visits).toEqual(['Program', 'ImportDeclaration', 'DebuggerStatement'])
  const child = { type: 'Nested', child: {} }
  child.child = child
  expect(parser.traverseAst(child, () => true)).toBe(false)
})
