# PASS 09C results

The starting and fetched `main` were
`00575cf5a77e3057e9b8942c49289e57f746b966`. PASS 09C adds local adversarial
qualification and fault tests. It retains Babel `7.29.14`, the five-stage
pipeline v3, its fingerprint, historical receipts and the input ceilings.
The available Worker boundary did not establish hard parser preemption.
No deployment, registrations or hosted workload ran.

## Measurement matrix

The Node harness ran three fresh processes per fixture on Node v24.18.0,
Linux x64, Intel i7-11700. Each Node wall and CPU cell is median / maximum
in milliseconds. CPU time is the process user-plus-system delta during
the timed sample, which can include runtime threads. RSS is the maximum
whole-process high-water mark across the three samples. It includes Node,
Babel, loaded fixtures and runtime memory. It cannot be read as isolated
parser allocation or Workerd memory. Token counts come from an untimed
Babel token pass. Stack failures and native JSON have no reliable token
count here. CI work is accumulated logical work from a separate actual
workerd JobRoom run.

| Fixture                 | Ext   | UTF-8 B | Tokens | Node parse |       Wall ms |        CPU ms | Peak RSS KiB | CI work | CI outcome      |
| ----------------------- | ----- | ------: | -----: | ---------- | ------------: | ------------: | -----------: | ------: | --------------- |
| Small module            | .js   |      26 |      6 | parsed     |   2.86 / 2.93 |   2.99 / 3.04 |       52,800 |     374 | passed          |
| Sparse byte maximum     | .ts   |  32,768 |      7 | parsed     |   5.10 / 5.72 |   5.24 / 6.10 |       53,828 | 104,803 | passed          |
| Dense array             | .js   |  24,004 | 24,003 | parsed     | 15.89 / 16.14 | 34.11 / 35.08 |       74,624 |  82,040 | `work_limit`    |
| Dense declarations      | .js   |  25,491 |  9,500 | parsed     | 12.99 / 13.38 | 26.55 / 27.23 |       71,364 | 104,395 | passed          |
| 3,000 parentheses       | .js   |   6,002 |      — | recursion  |   4.56 / 4.62 |   5.57 / 5.62 |       54,556 |  18,716 | `work_limit`    |
| 500 parentheses         | .js   |   1,002 |      — | recursion  |   4.56 / 4.62 |   5.49 / 5.58 |       54,568 |   3,540 | passed          |
| Nested mixed containers | .js   |   1,202 |      — | recursion  |   5.39 / 5.46 |   7.40 / 7.62 |       55,016 |   4,187 | `work_limit`    |
| Delimiters in literal   | .js   |  32,768 |      6 | parsed     |   3.85 / 3.87 |   4.48 / 5.05 |       58,940 | 104,803 | passed          |
| Tuple/union density     | .ts   |  25,011 | 15,006 | parsed     | 16.20 / 17.49 | 37.15 / 40.96 |       77,056 |  85,124 | `work_limit`    |
| TypeScript overloads    | .ts   |  27,361 |  8,360 | parsed     | 17.56 / 17.71 | 34.69 / 35.01 |       70,888 | 103,516 | passed          |
| Nested JSX              | .jsx  |   1,264 |  1,263 | parsed     |   4.72 / 4.74 |   6.85 / 7.42 |       54,744 |   4,835 | `work_limit`    |
| TSX lookahead           | .tsx  |      72 |     38 | parsed     |   8.42 / 8.56 |   8.98 / 9.15 |       53,984 |     656 | passed          |
| Nested TSX              | .tsx  |   1,464 |  1,449 | parsed     | 10.07 / 10.57 | 13.44 / 13.92 |       55,692 |   5,199 | `work_limit`    |
| 64 imports              | .js   |   1,014 |    192 | parsed     |   2.71 / 2.79 |   3.21 / 3.23 |       53,224 |   6,775 | `checks_failed` |
| 65 imports              | .js   |   1,030 |    195 | parsed     |   2.56 / 2.59 |   2.96 / 2.99 |       53,228 |   6,893 | `work_limit`    |
| Invalid JS escape       | .js   |      14 |      — | syntax     |   1.27 / 1.27 |   1.29 / 1.30 |       52,928 |     407 | `checks_failed` |
| Nested JSON             | .json |  24,002 |      — | parsed     |   1.06 / 1.10 |   1.42 / 1.42 |       54,336 |  73,844 | passed          |
| Maximum JSON string     | .json |  32,768 |      — | parsed     |   0.03 / 0.03 |   0.05 / 0.05 |       52,740 | 100,689 | passed          |
| Invalid JSON escape     | .json |       9 |      — | syntax     |   0.04 / 0.04 |   0.06 / 0.06 |       52,716 |     393 | `checks_failed` |

Across 120 subprocess samples, 96 parsed, 12 raised a catchable RangeError,
and 12 raised the expected syntax errors. There were no timeouts, crashes or
unexpected classifications. The first tested failing parenthesis depth in
Node was 500, after 250 passed. Local workerd passed 500 and returned
`work_limit` at 3,000. Stack thresholds vary with the runtime. The worst
observed parser wall time was **17.71 ms** on TypeScript overloads.
The highest process CPU sample was **40.96 ms** and the highest RSS was
**77,056 KiB**, both on the tuple/union fixture. The largest sampled positive
heap delta was **4,485,232 B** on overloads. Heap delta samples before and
after parsing do not capture peak heap.

Workerd classified the 40 single-file jobs as 19 passed, 13 work-limit
failures and eight validation/policy failures. The four-file dense maximum
snapshot passed twice with 131,072 input bytes and 490,350 logical work.
Syntax took 29–32 ms, lint 19–21 ms and imports 13–14 ms of local
stage wall time. These figures include snapshot loading, traversal and
stage handling as well as parsing. Three separate parse stages therefore
had measurable cost on the dense snapshot, but the evidence does not
justify changing durability boundaries or carrying AST state across stages.
No Workerd CPU or peak-isolate-memory figure was available.

## Recovery evidence

- The isolated parser corpus, aggregate test and timer probe passed in
  local workerd. The corpus assertions cover expected terminal categories
  and unchanged HEAD. Tenant isolation and non-execution remain covered by
  the existing Workerd API suite.
- The PASS 09B isolated restart command resumed all four checkpoint
  boundaries. The isolated expiry command settled an orphan without owner
  polling. The analysis integration test passed.
- SQLite injection rejected a finished parser result after elapsed-window
  expiry, owner cancellation or generation rollover. Parser exception
  normalization and a pre-aborted stage were tested independently.
  Existing regression tests cover rollback, duplicate dispatch and
  continuation, historical receipt preservation, and unsupported fingerprints.
- The injected orphan and controlled recreation do not establish native
  isolate-kill recovery. Hosted parser CPU, peak isolate memory, and
  cross-tenant contention remain unverified.

[Parser limits, reproduction and next qualification boundary](../ci-parser-resource-qualification.md)

## Validation and change footprint

`npm ci` ran with Node v24.18.0 and npm 11.16.0. `npm run validate` passed
type checking, lint, formatting, fingerprint and source-size checks, the
production Worker and client builds, and 189 default tests in 63 files.
Four opt-in tests are skipped by default. The three corpus, aggregate and
timer tests passed when enabled, and the deadline test passed in its
separate isolated run. The restart and analysis integration commands also
passed separately.

The baseline and current unminified esbuild Worker bundles were byte-identical
at **2,246,723 B** when built with consistent relative dependency paths.
Production source, the CI fingerprint and dependency manifests are unchanged.
The before and after npm audit advisory entries matched exactly at 16
findings, with one low and 15 high.
