# PASS 09B results

The clean starting point and fetched `main` were both
`a91ffaa98f4ba6d46eaa0955fc8456c6d9c851eb`. Migration 5 adds the validated
stage cursor and timing map for pipeline version 3. Integrity and source policy
are followed by syntax, AST lint and relative imports. The lint rules flag
debugger statements and duplicate unbound imports without attributes. No
submitted source is executed.

## Evidence

- Isolated local workerd tests recreate both Durable Objects at each of the
  four nonterminal stage checkpoints and resume the same logical job to a
  passing receipt. Separate workerd runs reject malformed syntax, debugger
  statements and missing imports without exposing submitted text.
- A workerd fault test used SQL inspection to orphan an admitted job after
  integrity by fencing its scheduler generation. The original repository
  alarm then expired the job without owner polling or redispatch.
- SQLite tests exercise rollback before a checkpoint, overlapping duplicate
  invocation, a lost continuation or ambiguous dispatch result followed by
  authorized redispatch, generation rollover, stale completion, cancellation
  at every boundary, malformed checkpoints, unsupported fingerprints and
  the version 2 migration. They model the state after dispatch loss and do not
  reproduce an actual lost network acknowledgment.
- Tenant isolation, immutable receipts and unchanged HEAD are checked through
  the existing authenticated APIs. The passing alarm test includes committed
  code that would throw if executed.

Run the time-sensitive workerd checks independently from the parallel suite.

```sh
CI_VERIFY_STAGE_RESTART=1 npx vitest run tests/ci-stages-workerd.test.ts
CI_VERIFY_STAGE_DEADLINE=1 npx vitest run tests/ci-stage-deadline-workerd.test.ts
```

## Measurements

Five local workerd jobs per size and pipeline used the same fixture and ran
without runtime restart. The small input was a 27 B TypeScript module. The
maximum byte input used four distinct 32 KiB TypeScript files with sparse
ASTs and comment padding. The AST limits are exercised separately in tests.

| Measure                                      |       PASS 09A |       PASS 09B |
| -------------------------------------------- | -------------: | -------------: |
| Small receipt latency median and range, ms   |  157 (155–160) |  463 (460–473) |
| 128 KiB receipt latency median and range, ms |  157 (157–161) |  464 (462–474) |
| Small logical work median                    |            417 |            444 |
| 128 KiB logical work median                  |        393,828 |        418,488 |
| Terminal checkpoint, small / maximum         |    172 / 179 B |    225 / 232 B |
| Passing stage alarm invocations              |              2 |              5 |
| Passing RepositoryRoom entries               | 1 HTTP + 2 RPC | 1 HTTP + 5 RPC |
| Unminified esbuild Worker bundle             |    1,641,924 B |    2,246,723 B |

Latency uses request start to persisted receipt. The staged pipeline adds
three 100 ms continuation delays. The five stage wall-time medians for the
small input were 0, 1, 0, 1 and 1 ms in order. All five medians at maximum
input were 1 ms. The first syntax sample in each staged group took 6 ms.
Zero-millisecond samples fall below clock resolution. Counts exclude test
inspection, receipt reads and the repository's deadline alarm. Alarm counts
derive from the committed stages and the installed SDK path, not provider
telemetry.

Babel's installed parser entry is 530,459 B. The installed Acorn ESM entry is
234,658 B and the TypeScript compiler entry is 9,112,572 B. These raw module
sizes compare candidate footprints. The measured end-to-end Worker bundle
increase is 604,799 B. Peak isolate memory and CPU time were unavailable in
this fixture. These are local measurements, and the maximum-byte samples do
not certify performance for all bounded ASTs.

## Dependencies

The direct runtime dependency is the already locked MIT-licensed
`@babel/parser@7.29.14`. No package versions changed. The audit returned the
same 16 findings before and after, with one low and 15 high. The advisory
entries matched exactly. See the [dependency audit](../security/dependency-audit.md).

No provider scheduling, memory or credit behavior was measured.
The application remains undeployed.

## Validation

`npm ci` ran with Node v24.18.0 and npm 11.16.0. `npm run validate` passed
type checking, lint, formatting, CI fingerprint, tracked source size, the
production Worker and client builds, and 181 default tests across 61 files.
The default run skips the wall-clock expiry test. Both isolated workerd
commands above passed, including the separately enabled expiry case.
