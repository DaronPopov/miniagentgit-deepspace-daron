const max = 32 * 1024
const pad = (prefix, suffix, fill = 'x') =>
  prefix + fill.repeat(max - Buffer.byteLength(prefix + suffix)) + suffix
const nest = (open, close, count, center = '0') =>
  open.repeat(count) + center + close.repeat(count)
const declarations = (n) =>
  Array.from({ length: n }, (_, i) => `const a${i}=0;`).join('')
const imports = (n) =>
  Array.from({ length: n }, (_, i) => `import "./m${i}";`).join('\n') + '\n'
const many = (name, extension, text, result = 'parsed') => ({
  name,
  extension,
  text: text.endsWith('\n') ? text : text + '\n',
  outcomes: Array.isArray(result) ? result : [result],
})

export const corpus = Object.freeze([
  many('normal', '.js', 'export const answer = 42;'),
  many('maximum-byte', '.ts', pad('export const x = "résumé";/*', '*/\n')),
  many('maximum-string', '.json', pad('["', '"]\n')),
  many('dense-arrays', '.js', '[' + '0,'.repeat(12000) + '0]'),
  many('dense-declarations', '.js', declarations(1900)),
  many('operators', '.js', '0+'.repeat(12000) + '0', ['parsed', 'recursion']),
  many('parentheses', '.js', nest('(', ')', 120)),
  many('stack-parentheses', '.js', nest('(', ')', 3000), [
    'parsed',
    'recursion',
  ]),
  many('mixed-containers', '.js', nest('({x:[', ']})', 150), [
    'parsed',
    'recursion',
  ]),
  ...[100, 125, 150, 200, 250, 500].map((depth) =>
    many(`parentheses-${depth}`, '.js', nest('(', ')', depth), [
      'parsed',
      'recursion',
    ]),
  ),
  many('literal-delimiters', '.js', pad('export const x = "', '";\n', '(')),
  many('functions', '.js', nest('function f(){', '}', 160, '')),
  many('templates', '.js', nest('`${', '}`', 180)),
  many('escape-density', '.js', '"' + '\\u0061'.repeat(5000) + '"'),
  many('invalid-escape', '.js', '"\\u{not-hex}"', 'syntax'),
  many('generics', '.ts', 'type T=' + nest('X<', '>', 180, 'string')),
  many(
    'conditional-types',
    '.ts',
    'type T=' + nest('X extends Y ? (', ') : never', 110, 'Z'),
  ),
  many(
    'mapped-types',
    '.ts',
    'type T=' + nest('{[K in keyof X]:', '}', 100, 'X'),
  ),
  many('tuple-union', '.ts', 'type T=[' + 'A & B | C,'.repeat(2500) + 'D]'),
  many('overloads', '.ts', 'declare function f(a:string):number;'.repeat(760)),
  many('type-assertions', '.ts', 'x' + ' as unknown'.repeat(2400)),
  many(
    'typed-modules',
    '.ts',
    'import type {Foo} from "./types"; export type {Foo as Bar};',
  ),
  many('jsx-nesting', '.jsx', nest('<b>', '</b>', 180, '{1}')),
  many(
    'jsx-attributes',
    '.jsx',
    '<b ' +
      Array.from({ length: 850 }, (_, i) => `a${i}={1}`).join(' ') +
      ' />',
  ),
  many(
    'tsx-lookahead',
    '.tsx',
    'const id = <T,>(x:T):T => x; export const v = <b>{id<string>("x")}</b>;',
  ),
  many(
    'tsx-nested',
    '.tsx',
    'const v: unknown = ' + nest('<b>{', '}</b>', 160, '<i/>'),
  ),
  many('tsx-malformed', '.tsx', 'const x = <T,>(x:T) => <div>{x};', 'syntax'),
  many('maximum-imports', '.js', imports(64)),
  many('excessive-imports', '.js', imports(65)),
  many(
    'mixed-imports',
    '.ts',
    'import "./a"; import "./a"; export * from "../b"; import "@scope/pkg"; import "#alias";',
  ),
  many('long-import', '.js', 'export * from "./' + 'a'.repeat(238) + '";'),
  many('json-nesting', '.json', nest('{"x":[', ']}', 3000)),
  many('json-dense', '.json', '[' + '0,'.repeat(16000) + '0]\n'),
  many('json-invalid-nesting', '.json', '[{"x":[0}]', 'syntax'),
  many('json-invalid-escape', '.json', '["\\x01"]', 'syntax'),
])

for (const { name, text } of corpus)
  if (Buffer.byteLength(text) > max)
    throw new Error(`Fixture exceeds per-file budget: ${name}`)

export const aggregateDense = Object.freeze(
  Array.from({ length: 4 }, (_, index) => ({
    path: `dense${index}.js`,
    text: pad(`/* file ${index} */` + declarations(1500) + '/*', '*/\n'),
  })),
)
