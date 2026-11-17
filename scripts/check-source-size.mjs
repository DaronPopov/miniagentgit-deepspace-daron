import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

// Exact generated paths and explicit vendor trees; never exempt by file size.
const generated = new Set(['src/router.ts', 'src/modals.tsx'])
const excludedRoots = ['node_modules/', 'vendor/', 'third_party/', 'dist/']
const integrationFiles = new Set([
  'worker.ts',
  'vite.config.ts',
  'vitest.config.ts',
])

export function permittedLines(path) {
  if (!/\.(ts|tsx)$/.test(path)) return undefined
  if (
    generated.has(path) ||
    excludedRoots.some((root) => path.startsWith(root))
  ) {
    return undefined
  }
  // Tests take precedence even inside integration directories.
  if (path.startsWith('tests/') || /\.(test|spec)\.tsx?$/.test(path)) return 185
  if (integrationFiles.has(path) || path.startsWith('src/server/')) return 300
  return 185
}

export function physicalLines(source) {
  if (source.length === 0) return 0
  // A final newline terminates a line; it does not create another physical line.
  return source.split('\n').length - Number(source.endsWith('\n'))
}

export function checkFiles(paths, read = (path) => readFileSync(path, 'utf8')) {
  return [...paths].sort().flatMap((path) => {
    const maximum = permittedLines(path)
    if (maximum === undefined) return []
    const actual = physicalLines(read(path))
    return [{ path, actual, maximum }]
  })
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
      .split('\0')
      .filter(Boolean)
    const results = checkFiles(paths)
    for (const { path, actual, maximum } of results) {
      console.log(
        `${actual > maximum ? 'FAIL' : 'OK'} ${path}: ${actual} lines (maximum ${maximum})`,
      )
    }
    const violations = results.filter(({ actual, maximum }) => actual > maximum)
    console.log(
      `Checked ${results.length} tracked source files; ${violations.length} violations.`,
    )
    if (violations.length) process.exitCode = 1
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
