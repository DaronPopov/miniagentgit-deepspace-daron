import { expect, it } from 'vitest'
import { analyzeSnapshot } from '../src/application/ci/analysis'
import { ciLimits } from '../src/application/ci/limits'
import { failedValidation } from '../src/application/ci/validation'
import type { AnalysisStage } from '../src/application/ci/stages'

function analyze(
  stage: AnalysisStage,
  sources: Readonly<Record<string, string>>,
) {
  const entries = Object.entries(sources)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([path, content]) => ({
      path,
      content,
      bytes: Buffer.byteLength(content),
      hash: '',
    }))
  return analyzeSnapshot(
    stage,
    {
      repositoryId: '',
      commitId: '',
      manifestHash: null,
      canonicalCommit: '',
      entries,
    },
    ciLimits(),
    failedValidation('none'),
    new AbortController().signal,
  )
}

it('accepts JS, JSX, TS, TSX, empty modules, Unicode, and strict JSON', () => {
  expect(
    analyze('syntax', {
      'a.js': 'export const α = 1;\n',
      'b.jsx': 'export const x = <span/>;\n',
      'c.ts': 'export const x: string = "hello";\n',
      'd.tsx': 'export const x: unknown = <b/>;\n',
      'e.json': '{"key":true}\n',
      'empty.js': '',
    }).checks.syntax,
  ).toBe('passed')
})

it('reports ordered fixed syntax diagnostics without parser text', () => {
  const result = analyze('syntax', {
    'z.ts': 'const hidden: = 2\n',
    'a.js': 'const confidential = ;\n',
    'e.json': '{ "private": }\n',
  })
  expect(result.diagnostics).toEqual([
    { check: 'syntax', code: 'invalid_syntax', path: 'a.js', line: 1 },
    { check: 'syntax', code: 'invalid_json', path: 'e.json' },
    { check: 'syntax', code: 'invalid_syntax', path: 'z.ts', line: 1 },
  ])
})

it('flags executable debugger statements without flagging properties or text', () => {
  expect(
    analyze('lint', { 'a.js': 'const value = {debugger:"debugger"};\n' }).state,
  ).toBe('passed')
  expect(
    analyze('lint', {
      'z.ts': 'debugger;\n',
      'a.js': 'if (true) {\n debugger;\n}\n',
    }).diagnostics,
  ).toEqual([
    { check: 'lint', code: 'debugger_statement', path: 'a.js', line: 2 },
    { check: 'lint', code: 'debugger_statement', path: 'z.ts', line: 1 },
  ])
})

it('resolves snapshot imports, cycles and index files, and defers bare and dynamic imports', () => {
  expect(
    analyze('imports', {
      'a.ts':
        'import "./b"; import "./folder"; import "@scope/pkg"; import("./absent");\n',
      'b.ts': 'export * from "./a.ts";\n',
      'folder/index.ts': 'import "../a";\n',
    }).state,
  ).toBe('passed')
})

it('rejects missing, escaping, ambiguous and alias imports in source order', () => {
  const result = analyze('imports', {
    'a.ts':
      'import "./missing"; import "../outside"; import "./b"; import "#alias";\n',
    'b.js': '',
    'b.ts': '',
  })
  expect(result.diagnostics.map((value) => value.code)).toEqual([
    'missing_import',
    'import_traversal',
    'ambiguous_import',
    'unsupported_import',
  ])
})

it('bounds parser depth and import fanout', () => {
  expect(
    analyze('syntax', {
      'a.js': 'const x = ' + '['.repeat(250) + '0' + ']'.repeat(250),
    }).code,
  ).toBe('work_limit')
  expect(
    analyze('imports', { 'a.js': 'import "pkg";\n'.repeat(65) }).code,
  ).toBe('work_limit')
})

it('reports only repeated matching imports without bindings or attributes', () => {
  const result = analyze('lint', {
    'a.js':
      'import "./a"; import x from "./a"; import "./a"; import "./b" with {type:"json"}; import "./b" with {type:"json"};',
  })
  expect(result.diagnostics).toEqual([
    {
      check: 'lint',
      code: 'duplicate_side_effect_import',
      path: 'a.js',
      line: 1,
    },
  ])
})
