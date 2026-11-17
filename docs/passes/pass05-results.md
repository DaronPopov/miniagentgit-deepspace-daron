# PASS 05 results

Status: complete local commit → durable CI admission → bounded asynchronous
validation → persistent versioned receipt → authenticated retrieval workflow.
Actual Node SQLite and local workerd Durable Object tests pass. Hosted identity,
automatic provider recovery and production bundling remain unverified. No app
registration, deployment, fabricated ID or cloud-credit-consuming operation ran.

## Revisions and inspection

- Starting SHA: `b1cfd5726cbe47837d98380b0591224075ec0498`, verified on main.
- Starting index/worktree: clean. Prior PASS 01–04 work preserved.
- Implementation SHA: recorded in the report update after implementation commit.
- Final report/delivery SHA: `git log -1 --format=%H -- docs/passes/pass05-results.md`;
  also reported to the user. A report cannot embed its own commit hash.

Read AGENTS.md, engineering standards, architecture, commit pipeline, free-tier
budget, API and PASS 04 results; inspected authority, migrations, ownership,
identity, payloads, schedulers and tests. Baseline: 62 tests passing. Verified
installed SDK/types and official DeepSpace rooms/background-jobs and Cloudflare
state/SQLite documentation. Source-size classifications were preserved; only the
actual new CI HTTP adapter receives the existing 300-line adapter allowance.

## Delivered changes

- `src/contracts/ci.ts`: readonly pipeline/job/state/diagnostic/snapshot/receipt types.
- `src/domain/ci/`: bounded diagnostics and fixed text source policy.
- `src/application/ci/`: lower-only resource configuration, implementation/policy
  fingerprints, validation, receipt construction, explicit store contract and
  repository-owned asynchronous engine.
- `src/server/storage/ci/`: migration-3 schema/triggers, durable admission,
  transactionally fenced execution/recovery/cancellation, bounded immutable
  snapshot reads, receipt validation and owner-authorized store operations.
- Existing migrations, RepositoryRoom and Hono owner adapter wire one engine per
  owner; HTTP mappings include CI outstanding capacity 429.
- `src/server/api/ci.ts`: real admission, status, receipt, list and cancellation.
- `scripts/ci-fingerprint.mjs`, declarations and checked JSON identity; Vite and
  standard validation reject a stale source fingerprint.
- Seven CI test suites plus fixture; migration/import-boundary test updates;
  local Miniflare-only storage inspection supports interrupted-row recovery tests.
- CI pipeline/state diagram documentation; architecture, API, budget, engineering
  standards and README updated. `git show --stat` lists exact delivery paths.

No production or development dependency was added. package-lock.json is unchanged.
DeepSpace remains 0.44.2; TypeScript 5.9.3, Hono 4.13.19, Vitest 4.1.12,
workers-types 5.20261117.1, Wrangler 4.164.0, esbuild 0.27.7,
Miniflare 5.20261110.0-beta and workerd 1.20261110.1. Node 24.18.0 /
npm 11.16.0. Native Cloudflare ctx.waitUntil(promise), storage.transactionSync,
storage.sql.exec and canonical namespace routing are reused; no guessed SDK
background API or second mutable owner was introduced.

## Implemented guarantees

CI-001–CI-010 are documented and enforced: immutable commit addressing; version /
fingerprint cache identity; fixed non-executing checks; bounded work/input/output;
SQL-persisted acceptance and results; no repository mutation; duplicate reuse;
fail-closed behavior; execution generations; bounded persistent retention.

Migration 3 is additive. Admission authorizes, checks immutable commit existence,
reuses duplicate identity, checks count/reservation quotas, then inserts queued
state atomically before HTTP 202. Claims serialize through the canonical owner.
Terminal job state and immutable receipt are written in the same synchronous
transaction. No await occurs in those closures. Receipt-write fault injection
proves actual SQLite rollback rather than a successful mock transaction.

Recovery runs once on the next authorized CI access per owner engine. Running
jobs are fenced/requeued or interrupted after bounded attempts. The new runner
cannot be overwritten by an old generation. One job runs per bounded drain;
additional authorized accesses advance backlog. waitUntil is only a lifetime
hint. Runtime death with no later request has no guaranteed autonomous progress.

Cancellation before claim prevents execution; active cancellation/deadline writes
a fenced terminal receipt and aborts cooperatively while retaining the live claim
until settlement. An HTTP disconnect does not cancel the job. A late result cannot
replace cancelled/expired/passed state. This is not rollback evidence for a killed
runtime. Queued jobs do not have an automatic wall-clock deadline.

Fixed checks cover content/manifest/commit SHA-256 integrity and versioned text
policy. No submitted scripts/config/plugins/shell/module execution occurs.
TypeScript syntax is explicitly deferred: the installed compiler trial failed
Worker resolution for Node builtins; externalizing them yielded 9,939,861
unminified bytes without demonstrated compatibility. Baseline server bundle:
1,416,981 bytes; final local server bundle: 1,451,037 bytes (+34,056). These are
esbuild test outputs, not production or compressed bundle claims.

## Exact validation and evidence

| Command                                                                                                   | Result                                                                                                                        |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                                                                  | Passed; 461 packages installed; lockfile unchanged. npm reported one low-severity audit item.                                 |
| `npm run type-check`                                                                                      | Passed strict TypeScript.                                                                                                     |
| `npm run lint`                                                                                            | Passed, zero warnings.                                                                                                        |
| `npm run format:check`                                                                                    | Passed.                                                                                                                       |
| `npm run check:ci-fingerprint`                                                                            | Passed checked source identity.                                                                                               |
| `npm run check:size`                                                                                      | Passed, 101 tracked TS/TSX source files, zero violations.                                                                     |
| `npm test`                                                                                                | Passed, 28 suites / 88 tests (26 additional tests).                                                                           |
| `npx vitest run tests/worker-repository.test.ts tests/worker-boundaries.test.ts tests/ci-workerd.test.ts` | Passed, 3 suites / 3 actual workerd tests.                                                                                    |
| `npm run validate`                                                                                        | All pre-build gates above passed; exits nonzero at production build.                                                          |
| `npm run build` (within validate)                                                                         | Expected blocker: wrangler vars DEEPSPACE_APP_ID remains `__APP_ID__`; official SDK refuses build before production bundling. |
| `git diff --cached --check`                                                                               | Passed; reviewed changed paths/content for secrets and unrelated files.                                                       |

Pure validation tests cover valid/missing/corrupt content/root/commit, wrong byte
counts, invalid/duplicate/order paths, source policy, newline/whitespace/invalid
text, diagnostic truncation and work/input caps. Submitted text that would mutate
global state and throw is treated as data and never executed. Fingerprints verify
the checked implementation graph and change with effective policy/version.

Real Node SQLite tests cover durable acceptance, duplicate reuse, separate versions,
owner isolation, invalid commit/page, passing/failing receipts with unchanged HEAD,
state/receipt immutability, outstanding/retention/byte quotas, serialized claims,
recovery, attempt exhaustion, stale-runner fencing and receipt-write rollback.
Deferred validators/controlled clocks cover early acceptance, active/queued cancel,
deadline, validator exceptions, output overflow and claim release. HTTP exercises
the real SDK verifier with ephemeral signed JWTs, including missing/forged JWT,
cross-owner isolation, bounded pages and receipt/status responses.

Actual local workerd runs real Hono/SDK verification, canonical DO and SQLite:
failure → corrected immutable commit → pass; duplicate reuse; original history and
HEAD unchanged by CI; completed receipt across full runtime recreation; seeded
running job recovery into generation 3. The seed uses Miniflare's test-only storage
inspector, not a production endpoint or a forcible interruption of a live runner.
No production Durable Object crash/authentication guarantee follows from it.

## Limits, risks and PASS 06 readiness

Free-tier-first ownership is unchanged: one deployment, no broker, paid service,
R2, external runner or polling service. Default CI limits: outstanding 4, retained
32, logical reservations 512 KiB, files 32, file 32 KiB, input 128 KiB,
diagnostics 16 / 2 KiB, receipt 8 KiB, attempts 2, one job / 512 KiB charged byte
work per invocation, two-second claim deadline, page 8. Full retained capacity
rejects new identities; duplicates still replay. No deletion/migration cleanup
policy is implemented. Logical reservations exclude SQLite page/index/WAL overhead.

Reported 500 credits, one slot and conservative uploaded-file 128 MiB budget are
planning inputs, not independently verified provider runtime quotas. App-wide
repository cardinality/rate, aggregate ingress, physical storage/CPU/memory/credit
caps and hosted browser login remain unresolved. No cloud load tests ran.
A passing receipt does not establish TypeScript syntax/type correctness or test
success. The production build guard remains, so later production bundling errors
are unknown. No LOC exceptions or weakened quality gates were introduced.

Ready for PASS 06's product site and authenticated repository/CI dashboard against
these local API contracts. Hosted authentication and production readiness still
require separate verification and explicit registration/deployment authorization.
