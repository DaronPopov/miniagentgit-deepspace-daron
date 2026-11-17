# Pass 03 results

Status: bounded scheduling foundation implemented and locally tested. The
repository commit engine is **not operational**; durable transactions, HEAD
compare-and-swap and hosted lifecycle integration remain Pass 04 work.

## Revisions and preservation of Pass 02

- Starting HEAD: `e8644c633a88fc26cd64cd767c92c778533565d9`, branch main.
- Initial status: exactly 34 staged Pass 02 paths, no unstaged changes.
- Preserved Pass 02 baseline commit: `fbbac0c0ebdc2350f2aafca01ad1699056ba8b41`.
- Final Pass 03 implementation SHA: `7cbf49228820440dc11d94aa1ea5eee0d1cac4ec`.
- This evidence document is committed separately. The final delivery/report SHA
  is returned by `git log -1 --format=%H -- docs/passes/pass03-results.md` and
  recorded in the delivery message; a tracked document cannot embed its own
  Git commit hash.

Before editing, read AGENTS.md, engineering standards, architecture, free-tier
budget and Pass 02 results; inspected staged paths, SDK integration/declarations
and relevant official docs. Re-ran Pass 02 validation: types, lint, formatting,
38 size checks and 23 tests passed; only the known app-registration build gate
failed. Reviewed the staged baseline and found no credential patterns. Preserved
its bytes in a dedicated commit under this pass's explicit authorization to
publish with that external gate documented. Nothing was reset or discarded.
Pass 02's original report records its historical uncommitted state; this report
records its subsequent publication. Pass 03 is a separate implementation commit.

## Design evidence

Studied all three exact pinned references before implementation:

- [Ferrite RingBuffer](https://github.com/DaronPopov/ferrite-llm/blob/e6a8b9eac44edaf0f841778aee6ab5e235ed54a8/ferrite-gpu-lang/src/pipeline/ring.rs)
- [Ferrite IPC pipeline](https://github.com/DaronPopov/ferrite-llm/blob/e6a8b9eac44edaf0f841778aee6ab5e235ed54a8/ferrite-os/crates/public/ferrite-apps/src/bin/ipc_ring_pipeline.rs)
- [feRcuda allocation event header](https://github.com/DaronPopov/feRcuda_runtime/blob/f42df397e061eab56120483001652b0e82016849/native/ptx_core/include/gpu/gpu_hot_runtime.h)

Adopted fixed slots, modulo indexing, explicit head/tail/occupancy, reject-on-full
admission, explicit dequeue, bounded backlog, distinct producer/consumer roles,
and separate compact recent-event retention. Diagnostic eviction is never an
admission policy. Rejected Rust locks, CUDA/device/shared-memory assumptions,
unsafe copies, uint32 sequence wrap, GPU polling and sleeps. Reference C is a
header declaration; no writer synchronization/eviction guarantee was inferred.
See [commit pipeline](../commit-pipeline.md) for the detailed study and behavior.

Reviewed current official DeepSpace architecture and room documentation and
installed deepspace/worker and Cloudflare declarations. SDK 0.44.2, TypeScript
5.9.3, Vitest 4.1.12; Node 24.18.0 and npm 11.16.0 unchanged. No dependencies or
lockfile changes. No new SDK exports were guessed or runtime binding added.

## Files created and changed

Created:

- src/domain/bounded-ring.ts — fixed FIFO, explicit occupancy, bounded removal.
- src/domain/event-ring.ts — recent-event eviction and sequence exhaustion.
- src/contracts/commit-events.ts — readonly lifecycle event union.
- src/contracts/commit-scheduling.ts — descriptors, outcomes, executor and clock.
- src/application/commit-scheduler.ts — owner admission, drain and cancellation.
- src/application/scheduled-request.ts — explicitly owned completion lifecycle.
- src/application/scheduler-policy.ts — bounds, descriptor copying and outcomes.
- tests/bounded-ring.test.ts; tests/event-ring.test.ts.
- tests/commit-scheduler.test.ts; tests/scheduler-cancellation.test.ts.
- tests/scheduler-deadlines.test.ts; tests/scheduler-fixture.ts.
- docs/commit-pipeline.md; docs/passes/pass03-results.md.

Changed architecture, engineering standards, and free-tier budget documentation;
updated tests/import-boundaries.test.ts to permit only type-only pure contract
imports in domain modules while retaining framework isolation and cycle checks.
AGENTS.md already links the mandatory standards; no rule change was necessary.
No production HTTP/SDK adapter or repository schema changed in Pass 03.

## Implemented invariants and limits

COMMIT-001 through COMMIT-008 are explicit in architecture. Scheduling never
changes HEAD. One instance serializes one repository; production must retain
exactly one instance inside the canonical repository owner. Default outstanding
capacity is 8, bounded at 32 including active work; no waiting-list promise is
allocated on full rejection. Descriptors retain bounded IDs/references, not file
payloads. Pending duplicate request IDs are rejected. Each accepted request has
one bounded ownership record, promise/controller/timer; drain uses one coalesced
microtask and promise settlement, without polling or lock-held waiting.

Separate diagnostic retention defaults to 64, maximum 256. Oldest eviction,
frozen snapshots and safe-integer exhaustion handling cannot affect admission
or durable authority. No raw errors, files, tokens or idempotency keys are logged.

Cancellation before execution removes and settles the request immediately.
Active cancellation resolves an unknown outcome and signals abort, retaining
execution ownership until actual executor settlement. Admission deadlines default
to 5 seconds, maximum 30 seconds, and include queue time. Expiry of active work
closes admission and cancels queued work; it never creates overlapping executors.
Shutdown settles all public admitted promises and reports actual quiescence.
An uncooperative executor may retain one bounded claim until settlement/runtime
exit. Deadlines require a live responsive event loop and trusted clock contract;
no timer preempts synchronous SQL or establishes rollback.

FREE-TIER-001 is preserved: planning inputs remain 500 available credits, one
app deployment slot, conservative 128 MiB uploaded files. Those do not verify
SQLite/DO/CPU/request quotas. No paid service, broker, background polling, cloud
load test, registration, deployment, fabricated ID or credit-consuming call ran.
The official app-ID build gate and placeholder are unchanged.

## Validation evidence

From a clean dependency installation:

| Exact command                 | Result                                                     |
| ----------------------------- | ---------------------------------------------------------- |
| `npm ci --no-fund --no-audit` | PASS; 461 packages installed                               |
| `npm run type-check`          | PASS                                                       |
| `npm run lint`                | PASS; zero warnings                                        |
| `npm run format:check`        | PASS                                                       |
| `npm run check:size`          | PASS; 51 tracked source/test/config files, zero violations |
| `npm test`                    | PASS; 14 test files, 45 tests (22 new)                     |
| `npm run build`               | BLOCKED; exit 1 at SDK **APP_ID** registration guard       |
| `npm run validate`            | EXIT 1 solely at that build gate                           |
| `git diff --cached --check`   | PASS                                                       |

The full validation script ran those checks in order; build was attempted,
not skipped or bypassed. Formatting was also rechecked after this report.
All handwritten scheduling/domain/test files remain under 185 physical lines;
commit-scheduler.ts is 180. No exceptions or adapter allowlist expansion.
Clean npm installation retains the existing scaffold ESLint deprecation warning.
Dependency vulnerability auditing was not performed (`--no-audit`).

Tests cover empty/capacity-one/full/wrap/no-overwrite/repeated FIFO reuse;
diagnostic order, eviction, immutable snapshots, safe-integer exhaustion and
bounded retention; simultaneous agent submissions; per-owner serialization;
independent repositories; full and duplicate rejection; synchronous/async
executor failures and continuation; conflict outcomes; queued and active abort;
cooperative versus ignored abort; deadline expiry and delayed timer checks;
shutdown without unresolved public promises; repeated refill and diagnostic
eviction without loss of accepted work. Fake timers, a controlled monotonic
clock, and deferred executors replace timing sleeps. Every controlled active
executor is explicitly settled by test teardown; timer counts return to zero.

Existing SDK JWT/Hono and real local SQLite schema tests still pass. Injected
executor tests prove scheduling only, not SQL atomicity, actual commits, hosted
concurrency, durable idempotency or production performance. No browser or hosted
runtime was validated. Build stops before bundling, so downstream build errors
remain unknown. CI uses the same preserved gate and is not claimed green.

Complete diff/path review found no generated artifacts or unrelated edits. A
bounded credential-pattern review of all 77 implementation tracked files found
zero private-key, GitHub token, AWS access-key or JWT patterns. No credentials
were added. This is a targeted review, not a comprehensive security audit.

## Readiness for Pass 04 and outstanding risks

The primitives and operation seams are ready for persistence integration work,
not production use. Pass 04 must bind one scheduler to the canonical live owner,
bound the prepared-content resolver, authenticate/authorize ingress, validate
reference/payload identity, implement atomic expected-HEAD plus metadata updates
and durable idempotency/quota accounting, and qualify rollback/conflict/retry
behavior with actual SQLite transactions. FIFO alone is not sufficient.

Worker restarts lose all in-memory acceptance and diagnostics. A cancelled or
timed-out active call may still have committed; only persistent replay/query can
resolve that uncertainty. No new owner/executor is safe while the old executor
may still run. Clock/event-loop and provider termination limitations remain.
Actual quotas and credit costs remain unknown; deployment and runtime validation
still require separate explicit authorization. There is no repository commit
engine, durable scheduling receipt or cross-SQLite/R2 transaction in this pass.
