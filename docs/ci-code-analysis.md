# Deterministic code analysis

Pipeline version 3 runs integrity, source policy, syntax, lint and imports in
that order. It stops at the first failing stage after collecting that stage's
bounded diagnostics. A passing receipt means all five enabled checks passed.
TypeScript semantic analysis remains deferred. The public CI routes and
pipeline selector retain their existing names.

## Parser and rule policy

The server uses the exact Babel parser version already present in the previous
development lockfile, `@babel/parser@7.29.14`. This pass promotes it to a
runtime dependency. The parser entry is MIT-licensed and works in the local
workerd bundle without adding a Node built-in requirement. Acorn's smaller
core lacks TypeScript support. The installed TypeScript compiler offers an
alternative syntax API but ships a substantially larger module and contains
compiler and host functionality outside this pass.

JavaScript runs through an ECMAScript module grammar with the fixed JSX and
TypeScript plugins selected by file extension. TypeScript syntax is checked
without a project, compiler host or type environment. JSON uses strict
`JSON.parse`. Empty JS and TS modules are valid. Empty JSON is invalid.
The server never evaluates parsed content or loads repository configuration,
package scripts, parser plugins or dependency modules.

The lint stage flags debugger statements and repeated static import
declarations with the same specifier and no bindings or import attributes
within one file. The diagnostic identifiers are `debugger_statement` and
`duplicate_side_effect_import`. Parser-enforced declaration grammar remains
part of syntax. Broader duplicate binding, dynamic evaluation and
scope-dependent rules are deferred. The parser's built-in error messages and
submitted snippets are excluded from diagnostics.

## Snapshot-only module resolution

The imports stage checks static imports and re-exports with string module
specifiers. Relative specifiers beginning with `./` and `../` resolve within
the committed path set. Supported extensions are `.js`, `.jsx`, `.ts`,
`.tsx` and `.json`. Explicit extensions are exact. Extensionless paths
consider both direct stems and directory index files across the supported
extensions and require exactly one match. Parent traversal is normalized and
cannot escape the root. Cycles are allowed because each edge is checked once
without following it recursively. The resolver reports fixed missing,
escaping, unsupported and ambiguous diagnostics.

Bare packages and scoped packages are external and deferred. Dynamic import
expressions, CommonJS require, TypeScript import expressions, package exports,
and tsconfig mappings are deferred. Alias-like specifiers beginning with
`#`, `~/` or `@/`, absolute paths, URL schemes and query or fragment
suffixes are unsupported. A name shaped like a bare package may be a project
alias. The resolver treats it as external without consulting configuration.
It does not access the filesystem or network.

## Bounds and receipts

Each stage reads the bounded immutable snapshot through RepositoryRoom.
ASTs are discarded after each file and parsed again in each analysis stage.
The input ceilings stay at 32 files, 32 KiB per file and 128 KiB total. The
parser sees at most 128 KiB per stage. AST traversal permits at most 8,192
nodes per file, 24,576 per stage and a depth of 128. Static import limits
are 64 per file and 256 per stage. The aggregate 512 KiB logical work budget
now charges scaled parser bytes, node visits, import resolution and
diagnostic creation. A hard limit emits `work_limit`. These counters do not
measure memory or CPU. The two-second stage window is checked after
synchronous parsing returns. It cannot preempt the parser.

Migration 5 adds an ordinal cursor and bounded timing map while keeping
historical rows and receipts. It interrupts unfinished version 2 jobs using
`pipeline_unavailable`. Existing version 1 and 2 terminal receipts retain
schema 1. Version 3 emits schema 2 and adds `syntax`, `lint` and `imports`
check states. An unrun new check is `skipped`; semantic TypeScript stays
`deferred`. Cancellation and expiry preserve verified completed checks.
The CI fingerprint covers the validator source graph and the parser's locked
version and integrity. See [durable stages](ci-durable-stages.md) and
[PASS 09B results](passes/pass09b-results.md).
