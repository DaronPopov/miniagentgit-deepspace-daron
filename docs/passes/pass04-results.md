# Pass 04 results

Status: the repository HTTP vertical slice functions locally with real
SQLite-backed Durable Objects, the existing scheduler, and controlled signed
JWT identities. Atomic commit, immutable snapshots and durable successful
idempotency are implemented. **Hosted DeepSpace authentication/deployment and
the official production bundle remain unverified.** No CI engine was implemented.

## Revisions and repository state

- Starting SHA: `69ff1dd0a1e7fa8ebaba6faf2e26a5fbad3ae291`, main, verified before edits.
- Starting checkout/index: clean; no unrelated work to reset or discard.
- Final implementation SHA: `e2d82ad2beef796691b7af76939b3ebec9161e51`.
- This results document is a separate report commit. Its final delivery SHA is
  obtained with `git log -1 --format=%H -- docs/passes/pass04-results.md` and
  recorded in the delivery message; a file cannot embed its own Git commit hash.

Read AGENTS.md, engineering standards, architecture, free-tier budget, pipeline,
and Pass 02/03 results before modifying. Inspected contracts, validation, schema,
routing, JWT adapter, scheduler and tests. Reviewed the complete changed-path
and content diff before committing. No registration, deployment, fabricated app
ID, credit-consuming DeepSpace operation, cloud load test or CI workflow change.

## Actual APIs and dependency choices

DeepSpace SDK/CLI remains **0.44.2**. Node 24.18.0, npm 11.16.0, TypeScript
5.9.3, Hono 4.13.19, Vitest 4.1.12, workers-types 5.20261117.1, Cloudflare Vite
plugin 1.69.1 and Wrangler 4.164.0 remain unchanged.

Verified installed declarations and official documentation for verifyJwt's
key/issuer/audience config and result envelope; SDK DOManifest; Cloudflare
DurableObjectState/ctx.id, DurableObjectId.equals, namespace idFromName/get,
storage.sql.exec().toArray(), transactionSync, and ctx.waitUntil. No assumed
SDK transaction helper or public RecordRoom SQL internals were used.

Two **test-only** dependencies are now explicitly pinned: esbuild 0.27.7 and
Miniflare 5.20261110.0-beta. Both versions were already installed transitively;
the lockfile adds their root declarations without replacing the dependency
graph. The local workerd package is 1.20261110.1. No production dependency,
ORM, storage driver, HTTP framework, external broker or paid service was added.

Miniflare's installed v5 declarations expose convertV4MiniflareOptions and
resourcePersistencePath; the harness uses those actual APIs, stable worker name,
useSQLite:true and a temporary persisted directory. cf:false disables external
Cloudflare metadata fetching. It bundles the real server worker entry only,
with the real exported RepositoryRoom, into a temporary ESM test artifact.
This is **not** a production Vite build, fake app ID, deployment or replacement
build command. Test runtimes are disposed and temporary files removed.

## Implemented authority, snapshots and API

One canonical app-private repository name maps to one actual Durable Object ID.
The object checks its ctx.id against namespace.idFromName before binding state.
Each live object retains one authority/runtime/scheduler instance, never one per
HTTP request. Wrong-owner namespace dispatch is rejected in a workerd test.

Creation stores identity/name/owner/time and a creation receipt atomically with
an empty HEAD. No fictional initial commit is inserted. Deterministic creation
routing by verified actor/key makes duplicate creation retryable without a global
mutable directory. Existing ownership is checked again inside authority methods.

Commits hash exact valid UTF-8 text, a canonical path-sorted full manifest, and
versioned canonical commit metadata using SHA-256. Parent-linked immutable
snapshots preserve old files after replacement/deletion. SQL triggers reject
update/delete of immutable content, manifests, commit/snapshot metadata and
receipts. Unknown-path delete is an explicit no-op; requested no-op commits still
have real metadata. Duplicate paths and file/directory collisions are rejected.

The sole HEAD advancement lives in commit-transaction.ts. One synchronous SQL
transaction checks stored identity/actor, durable replay/digest reuse, expected
HEAD, request validity and post-commit quotas; inserts content, full manifest,
metadata, snapshot hash and replay receipt; compare-and-swaps HEAD/version; and
updates retained logical accounting. No await, hashing, sleep, polling, network
or external blob operation occurs inside that callback. Preparation happens
outside; immutable base data plus a transaction-time HEAD recheck prevent stale
preparations from changing HEAD. No cross-SQLite/R2 atomicity is claimed.

Schema migration v2 reuses all original tables, adding a migration marker,
creation receipt, snapshot hash and immutable-row triggers. Initialization is
idempotent and preserves prior identity/empty HEAD without inventing historical
commits or creation receipts for manually populated pre-engine databases.

Implemented API coverage (all successes use typed HTTP 200 envelopes):

| Method / path                                    | Behavior                                     |
| ------------------------------------------------ | -------------------------------------------- |
| POST /api/repositories                           | Real creation / same-request replay          |
| GET /api/repositories/:id                        | Owner-only metadata                          |
| GET /api/repositories/:id/head                   | Authoritative HEAD/version, initially null/0 |
| POST /api/repositories/:id/commits               | Bounded scheduled atomic commit              |
| GET /api/repositories/:id/commits/:commit        | Immutable metadata                           |
| GET /api/repositories/:id/tree                   | Bounded current or explicit snapshot page    |
| GET /api/repositories/:id/files/:commit?path=... | Immutable JSON text                          |
| GET /api/repositories/:id/idempotency/:key       | Actor-scoped durable successful replay       |

The existing JWT verifier runs at public and owner boundaries. No synthetic
owner or role header grants access. Bodies, paths, IDs and queries are validated;
unknown fields/queries and duplicate query keys are rejected. JSON streams are
byte-bounded before parsing and reject malformed UTF-8. Messages reject unpaired
surrogates to preserve exact hash/storage semantics. Errors expose no raw SQL,
source, token, DB handle or SDK debug claims. [API reference](../api.md) defines
exact payloads, canonical formats, quotas, status mappings and retry semantics.
Browser login and the platform's actual audience remain unverified/fail-closed.

## Scheduler ownership and cancellation

The private payload map is bounded to the scheduler's outstanding capacity
(default 8, maximum 32, including active). Slots own copied validated text and
context; descriptors carry only bounded IDs and random opaque references. Only
active execution prepares hashes. Queued cancellation frees its payload; active
payloads remain until actual executor settlement. A lifetime-extension callback
failure still awaits the real executor before releasing ownership.

Expected quota/authorization/input rejection now has a typed executor outcome;
it is not misreported as successful commit or an exception containing raw input.
FIFO, deadline fencing, cancellation, diagnostic eviction, sequence exhaustion
and shutdown behavior from Pass 03 remain. The owner requests ctx.waitUntil
lifetime for in-flight execution, without claiming durable acceptance.

A public cancelled/failed/503 result never proves rollback. The cancellation
regression test aborts during the transaction, allows SQL to commit, then obtains
the exact durable result via replay. Successful replay is checked before stale
HEAD and incurs no new commit, counter charge or HEAD version. Reusing that key
with different semantics conflicts. Failed validation/conflict/quota keys are
not durably reserved. A missing receipt during active work is not definitive.

## Clean-install validation

| Exact command                 | Result                                                     |
| ----------------------------- | ---------------------------------------------------------- |
| `npm ci --no-fund --no-audit` | PASS; 461 packages installed                               |
| `npm run type-check`          | PASS                                                       |
| `npm run lint`                | PASS; zero lint warnings                                   |
| `npm run format:check`        | PASS                                                       |
| `npm run check:size`          | PASS; 75 tracked source/test/config files, zero violations |
| `npm test`                    | PASS; 21 test files, 62 tests (17 new)                     |
| `npm run build`               | BLOCKED; exit 1 at preserved unregistered app-ID guard     |
| `npm run validate`            | EXIT 1 solely at that build gate                           |
| `git diff --cached --check`   | PASS                                                       |

The full validation script ran all checks in order from the clean installation.
Formatting was rechecked after documentation changes/report creation. No size
exception: storage authority is 180 lines, payload runtime 177, scheduler 177;
all tests remain below 185. Two new explicit 300-line allowlist paths are genuine
HTTP adapters (repositories.ts and repository-owner.ts); no storage/business
module is exempted. Static relative imports pass cycle and domain-isolation tests.
The old scaffold ESLint deprecation warning persists; dependency vulnerability
auditing was not performed (`--no-audit`).

A bounded credential-pattern review of 103 implementation tracked files found
zero private-key, GitHub token, AWS access-key or JWT patterns. Only ephemeral
runtime-generated test signing keys are used. This is a targeted review, not an
exhaustive security audit. No workerd/Vitest processes remained after tests.

## Transaction and runtime evidence boundaries

- **Real Node SQLite, same authority code:** creation and conflicting duplicate;
  ownership/routing isolation; initial/sequential snapshots; old-file retrieval;
  known SHA-256 and canonical ordering; same-key replay/different-payload conflict;
  competing preparations; exactly one HEAD advance; stale HEAD; logical/file/count
  quotas; exact byte cap and one-byte-under rejection; additive migration;
  close/reopen persistence; immutable-row guards; scheduled payload cleanup.
- **Real rollback:** a synchronous injected fault after all immutable/replay
  inserts but before HEAD update rolls back contents, manifests, metadata,
  snapshots, receipt and counters. Retry subsequently succeeds on that same DB.
  This is BEGIN IMMEDIATE/COMMIT/ROLLBACK, not a mocked successful transaction.
- **Actual local workerd SQLite Durable Objects:** bundled production server
  HTTP → namespace routing → RepositoryRoom → scheduler → storage.sql.exec and
  transactionSync. Tests cover signed controlled JWTs, owner-only access, create,
  commit/HEAD/tree/file/metadata, two competing expected-HEAD HTTP submissions
  yielding one 200 and one 409, successful replay after disposing/recreating the
  entire Miniflare runtime, and refusal of a second incorrectly named owner.
- **Real local HTTP boundaries:** malformed IDs/queries/JSON/UTF-8, oversized
  body/file/page, owner injection and forged JWTs rejected. No generic SQL path.
- **Pure controlled scheduler tests:** retained alongside all prior tests;
  these remain scheduling evidence rather than independent SQL atomicity proof.

Fault injection is exercised in the actual Node SQLite authority, not inside a
hosted or forcibly killed workerd transaction. Local workerd tests establish
transaction API/lifecycle integration but do not prove provider crash/recovery,
network disconnect propagation or production failure behavior. Test JWTs verify
the real SDK against controlled keys, not DeepSpace-hosted OAuth. No browser or
cloud deployment was tested. The official production build stops before bundling,
so client/production bundling errors after registration remain unknown.

## Remaining risks and deferred work

The local engine meets this pass's vertical slice, not a production service
qualification. Actual hosted audience/login, quotas, pricing and deployment are
unknown. Per-repository logical budgets are implemented; app-wide repository
cardinality, aggregate ingress/rate, physical SQLite/WAL, memory, CPU and credit
limits remain unimplemented/unverified. Reported 500 credits, one app slot and
128 MiB uploaded files are only planning inputs; no R2/uploads are used.

Worker death loses scheduling/payloads/events, not committed metadata/HEAD/replay.
A deadline closes the scheduler permanently for that owner lifetime; reads and
replay remain available, but safe owner recreation is required to resume commit
admission. No hot replacement while execution is uncertain. waitUntil is a
best-effort runtime lifetime request, not durable job storage or an interrupt.

No branches, Git wire protocol, merges, arbitrary binaries, object store,
restore/diff/history-list engine, scoped API-token issuance, background cleanup,
feature UI or CI execution was added. Hosted registration/deployment requires
new explicit authorization; the current app-ID placeholder is unchanged.
