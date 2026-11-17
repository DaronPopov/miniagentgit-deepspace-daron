import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('..', import.meta.url))
const output = 'src/ci-source-fingerprint.json'
const roots = [
  'src/application/ci/validation.ts',
  'src/application/ci/pipelines.ts',
  'src/application/ci/receipt.ts',
  'src/server/storage/ci/snapshot.ts',
]
export function expectedCiFingerprint() {
  const files = new Map()
  function visit(path) {
    if (path === output || files.has(path)) return
    const absolute = resolve(root, path),
      source = readFileSync(absolute, 'utf8')
    files.set(path, source)
    if (!/\.tsx?$/.test(path)) return
    const syntax = ts.createSourceFile(
      path,
      source,
      ts.ScriptTarget.Latest,
      true,
    )
    for (const statement of syntax.statements) {
      if (
        !ts.isImportDeclaration(statement) &&
        !ts.isExportDeclaration(statement)
      )
        continue
      const name = statement.moduleSpecifier
      if (!name || !ts.isStringLiteral(name) || !name.text.startsWith('.'))
        continue
      const base = resolve(dirname(absolute), name.text)
      const target = [base, `${base}.ts`, `${base}.tsx`, `${base}.json`].find(
        existsSync,
      )
      if (!target || !target.startsWith(root))
        throw new Error(`Unresolved CI dependency: ${name.text}`)
      visit(target.slice(root.length))
    }
  }
  for (const path of roots) visit(path)
  const hash = createHash('sha256').update('miniagentgit-ci-source-v1\0')
  for (const [path, source] of [...files].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  ))
    hash.update(JSON.stringify([path, source]))
  return { schema: 1, sourceFingerprint: hash.digest('hex') }
}
export function verifyCiFingerprint() {
  if (
    JSON.stringify(JSON.parse(readFileSync(resolve(root, output), 'utf8'))) !==
    JSON.stringify(expectedCiFingerprint())
  ) {
    throw new Error(
      'CI fingerprint is stale; run npm run ci:fingerprint and review the changed identity',
    )
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.includes('--check')) {
    verifyCiFingerprint()
    console.log('CI source fingerprint verified')
  } else {
    writeFileSync(
      resolve(root, output),
      JSON.stringify(expectedCiFingerprint(), null, 2) + '\n',
    )
    console.log('CI source fingerprint updated')
  }
}
