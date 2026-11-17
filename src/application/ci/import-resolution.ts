import { moduleExtensions } from './analysis-parser'

export function relativeIssue(
  path: string,
  specifier: string,
  files: ReadonlySet<string>,
) {
  if (!specifier.startsWith('./') && !specifier.startsWith('../'))
    return !specifier || /^(?:[./#~]|@\/)|[:\\?#]/.test(specifier)
      ? 'unsupported_import'
      : undefined
  if (specifier.length > 240 || !/^[a-zA-Z0-9_./-]+$/.test(specifier))
    return 'unsupported_import'
  const parts = path.split('/').slice(0, -1)
  for (const part of specifier.split('/')) {
    if (!part) return 'unsupported_import'
    if (part === '..') {
      if (!parts.length) return 'import_traversal'
      parts.pop()
    } else if (part !== '.') parts.push(part)
  }
  const last = specifier.split('/').at(-1)
  if (last === '.' || last === '..') return 'unsupported_import'
  const target = parts.join('/')
  if (last?.includes('.')) {
    if (!moduleExtensions.some((extension) => target.endsWith(extension)))
      return 'unsupported_import'
    return files.has(target) ? undefined : 'missing_import'
  }
  const matches = moduleExtensions.reduce(
    (count, extension) =>
      count +
      Number(files.has(target + extension)) +
      Number(files.has(target + '/index' + extension)),
    0,
  )
  return matches === 1
    ? undefined
    : matches === 0
      ? 'missing_import'
      : 'ambiguous_import'
}
