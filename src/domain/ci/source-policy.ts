import type { CiSnapshotEntry } from '../../contracts/ci'
import type { DiagnosticCollector } from './diagnostics'

export const SOURCE_POLICY = Object.freeze({
  version: 1,
  extensions: Object.freeze([
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'md',
    'txt',
    'css',
    'html',
    'yml',
    'yaml',
    'toml',
  ]),
  forbiddenSegments: Object.freeze(['.git', 'node_modules', 'vendor']),
})
export function sourcePolicy(
  entry: CiSnapshotEntry,
  maximumLines: number,
  diagnostics: DiagnosticCollector,
) {
  const text = entry.content
  if (text === null) return
  const extension = entry.path.split('.').at(-1) ?? ''
  if (
    (!SOURCE_POLICY.extensions.includes(extension) &&
      entry.path.split('/').at(-1) !== '.gitignore') ||
    entry.path
      .split('/')
      .some((part) => SOURCE_POLICY.forbiddenSegments.includes(part))
  ) {
    diagnostics.add('source', 'unsupported_path', entry.path)
  }
  if (
    text.includes('\0') ||
    /\r(?!\n)/.test(text) ||
    new TextDecoder().decode(new TextEncoder().encode(text)) !== text
  ) {
    diagnostics.add('source', 'invalid_text', entry.path)
    return
  }
  if (text.length > 0 && !text.endsWith('\n'))
    diagnostics.add('source', 'missing_final_newline', entry.path)
  let start = 0,
    line = 0
  while (start < text.length) {
    line++
    if (line > maximumLines) {
      diagnostics.add('source', 'line_limit', entry.path)
      break
    }
    const newline = text.indexOf('\n', start)
    let end = newline < 0 ? text.length : newline
    if (text[end - 1] === '\r') end--
    // Constant-time suffix check; never run a backtracking regex on source text.
    if (text[end - 1] === ' ' || text[end - 1] === '\t')
      diagnostics.add('source', 'trailing_whitespace', entry.path, line)
    start = newline < 0 ? text.length : newline + 1
  }
}
