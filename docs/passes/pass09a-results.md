# PASS 09A results

The clean starting point was `3a3c6798cea0ee933644eef1997659c9977465a8`,
the fetched `main` and PASS 08B result. The change adds migration 4,
the fixed stage validators, durable dispatch and stage persistence, the
AppJobRoom adapter, and local SQLite and workerd coverage. The dependency lock
and deployment bindings are unchanged. The application was not deployed.

## Local evidence

- `CI_VERIFY_STAGE_RESTART=1 npx vitest run tests/ci-stages-workerd.test.ts`
  observed integrity at sequence one, recreated the local runtime and both
  Durable Objects, then observed source policy and the immutable receipt at
  sequence two. The same test exercises concurrent identical admission, invalid
  pipeline selection, valid and failing source policy, unchanged HEAD during
  CI, denied public dispatch, denied cross-owner access and cross-repository
  absence under another authenticated principal. The isolated command avoids
  contention from parallel suites when sampling the 100 ms intermediate window.
- Node SQLite fault injection covered rollback before checkpoint persistence,
  staged redispatch after integrity with a missing continuation, the old
  generation arriving late, replay after the terminal receipt, cancellation
  before integrity, between stages and after completion, expired and exhausted
  dispatch budgets, a corrupt snapshot and an unsupported fingerprint.
  The parity assertion compared the staged result with the composed fallback on
  the same immutable snapshot. Existing checks retain coverage for validator
  fixtures, input limits, immutable legacy receipts and credential boundaries.
- Mid-flight process termination at each instruction boundary, actual lost
  acknowledgments from workerd, hosted cancellation timing, hosted alarm
  delivery and provider resource characteristics remain unverified. The
  SQLite test models the recoverable persistent state directly.

## Local measurements

Seven one-file jobs per executor used the same workerd fixture, a fresh
repository per executor and no runtime restart during sampling. Millisecond
durations use the local wall clock. The zero millisecond source samples are
below its resolution.

| Measure                                                                         |           Fallback |            Staged |
| ------------------------------------------------------------------------------- | -----------------: | ----------------: |
| Request start to persisted receipt, median (range), ms                          |            3 (1–4) |     156 (156–160) |
| Durable admission to first stage entry, median (range), ms                      |                  — |        53 (52–57) |
| Integrity entry to completion, median (range), ms                               | combined validator |           1 (0–1) |
| Source entry to completion, median (range), ms                                  | combined validator |           0 (0–0) |
| Passing-path JobRoom stage invocations                                          |                  0 |                 2 |
| Passing-path repository DO entries, excluding observations and deadline cleanup |             1 HTTP |    1 HTTP + 2 RPC |
| Serialized terminal checkpoint                                                  |                  — |             171 B |
| Serialized dispatch body payload                                                |                  — |             318 B |
| Logical work charged, median (range)                                            |  358 B (296–358 B) | 358 B (296–358 B) |
| Unminified esbuild server bundle                                                |        1,629,143 B |       1,640,048 B |

Enqueue-to-first-stage latency was not instrumented separately. The admission
measurement includes reservation, binding enqueue and alarm wait. The expected
two alarm invocations follow from the two stages observed and the installed
SDK's alarm path and delay. The local Miniflare SQL inspector cannot query the
SDK JobRoom's alarm rows because that class does not expose Durable Object RPC.
Repository entry counts exclude fixture SQL inspection and count transport
calls rather than individual SQL statements. Staging adds 10,905 B to this
server bundle. Greater durability adds latency and extra snapshot reads in this
test. The measurements do not estimate provider CPU, memory or credits.

[Durable stage lifecycle and limits](../ci-durable-stages.md)

## Validation

`npm ci` ran with Node v24.18.0 and npm 11.16.0. `npm run validate` passed
type checking, lint, formatting, CI fingerprint, tracked source size, 168 tests
in 58 files and the production Worker and client build. The existing dependency
audit reports 16 findings. This pass adds no runtime packages and does not
change the lockfile. Staged files and built JavaScript and source maps were
checked for private-key markers and matching local credential values.
