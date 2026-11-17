# MiniAgentGit architecture

## Scope and boundaries

Pass 04 implements a local repository vertical slice: create/read repository,
empty/read HEAD, immutable text commits, tree/file/commit retrieval and durable
successful replay lookup. HTTP → verified transport → application service →
canonical RepositoryRoom → synchronous SQLite authority. No mutable HEAD exists
in HTTP or the scheduler. No branches, merges, Git protocol, binaries, R2, MCP,
restore/diff engine, CI execution or new UI are implemented.

FREE-TIER-001 remains mandatory: one DeepSpace Free-plan app, bounded text and
in-memory state, no paid integrations or background polling. Reported 500
credits, one deployment slot and conservative 128 MiB uploaded-file allowance
are planning inputs. SQLite/DO/CPU/request entitlements remain unknown. See
[budget](free-tier-budget.md), [API](api.md), and [pipeline](commit-pipeline.md).
No registration, deploy, app-ID fabrication or credit-consuming tests ran.

The SDK is pinned at 0.44.2. Official Vite/React/Hono/Cloudflare scaffolding is
retained. The required SDK users schema and six inert SDK Durable Objects do
not own repository data or expose generic repository mutations. RepositoryRoom
is the custom SQLite Durable Object prepared in Pass 02. Its manifest/binding
and namespace are unchanged; only its actual owner behavior is implemented.

## Identity and repository ownership

The public transport uses SDK `verifyJwt` with configured key, issuer, audience
and expiry. It forwards the original Bearer token, not an identity assertion;
RepositoryRoom verifies it again. Browser useAuth remains an unmounted display
hook. No custom OAuth or token protocol is introduced. Real hosted token audience
and browser-to-Bearer wiring are not guessed; absent config fails closed.

Creation routes deterministically from verified subject and creation key. One
logical repository maps to the app-private `repo:<validated ID>` namespace name.
Before binding service state, RepositoryRoom compares its actual ctx.id to
`REPOSITORY_ROOMS.idFromName(canonicalName)`. A different object cannot become a
second owner through a forged request path. A live owner lazily instantiates
exactly one runtime/scheduler and retains it for its lifetime. There is no global
scheduler, per-request scheduler, global repository manager or second HEAD.

Persisted metadata records identity, owner, name and creation timestamp. Creation
is atomic with an empty HEAD and creation receipt; it never inserts a commit.
Same key/name retries return existing metadata; different name conflicts.
Authorization is separate from identity. The authority checks persisted owner
and repository ID on reads and inside the commit transaction. HTTP also rejects
nonowners before admitting commit payloads. App role/client headers grant no
repository permission. Future scoped API tokens remain design-only.

## Contracts and implementation responsibilities

- src/domain: readonly serializable repository/results, scalar validation,
  canonical SHA-256 formats, fixed FIFO and diagnostic rings. No React, HTTP,
  Cloudflare SDK or storage dependency.
- src/application: shared operation/service interfaces, bounded validators,
  hashing preparation, scheduler, private bounded payload lifecycle. Persistence
  is injected; no SQL or framework dependency.
- src/server/storage: synchronous Database port, row checks, versioned schema
  initialization, creation/read authority and sole commit transaction.
- src/server/deepspace: actual DurableObject lifecycle and SQLite port adapter;
  existing SDK JWT verifier.
- src/server/api: Hono public dispatch, owner adapter, bounded body parsing,
  scalar/query validation and typed response mapping. No SQL.

The existing ten-operation interface remains as the future full API contract;
the implemented RepositoryService explicitly selects this pass's subset plus
creation and replay. PreparedCommit now contains immutable content candidates,
manifest/hash, canonical metadata and semantic digest. No raw prepared object
is accepted from HTTP or exposed over a Durable Object RPC method.

## Canonical snapshots and hashing

SHA-256 hashes exact UTF-8 file text. The canonical manifest is JSON
`["manifest-v1", [[path,contentHash,utf8Bytes],...]]`, sorted by ASCII path order.
A full manifest per commit fixes every path/content association. SQL triggers
prevent updates/deletes to contents, commits, manifests, snapshots and receipts.
Old file retrieval never consults current HEAD or overwrites old content.
Snapshot puts replace/add paths; deletes remove them; unmentioned files survive.
There are no mutable file pointers. File/directory prefix collisions are invalid.

Commit ID is SHA-256 of UTF-8 JSON `["commit-v1", repositoryId, parentId,
actorSubject, message, serverCreatedAt, manifestHash]`. No object-key iteration,
locale sort, line-ending change or Unicode normalization affects canonical data.
The semantic request digest is versioned JSON including sorted changes,
repository/actor/expected HEAD/message, excluding server timestamp/key. This
allows a retried key to match even when preparation happens at a new time.
Creation ID is a 128-bit prefix of a separate versioned SHA-256 domain; this is
application identity, not Git compatibility. Collision resistance is assumed.

## Schema and atomic transaction

Pass 02 tables are reused: repository metadata/logical_bytes, commits, HEAD with
version, file_contents, manifest_entries and actor-scoped idempotency. Additive
schema migration v2 introduces creation_receipt, snapshots with manifest_hash,
immutability triggers and repository_migrations. Initialization is synchronous,
transactional and idempotent. It preserves prior identity/HEAD and creates no
fictional commits. Historical populated/manual pre-engine databases with missing
creation receipts are not automatically assigned a receipt or owner.

One owner operation (`persistCommit`) alone advances HEAD. Its transaction:

1. Reads persisted repository identity and owner and authorizes the actor.
2. Resolves the actor/key receipt. Same digest returns its committed metadata;
   different digest returns CONFLICT before any stale-HEAD rejection.
3. Compares expected HEAD, validates the request again, checks snapshot path
   compatibility, deduplicates immutable contents, and computes quota charges.
4. Checks post-commit file count, durable commit count via HEAD.version, and
   retained logical bytes. Every expected rejection occurs before writes.
5. Inserts content, metadata, snapshot hash, full manifest and replay receipt.
6. Compare-and-swaps HEAD by its observed version and checks SQLite changes().
7. Advances logical-byte counter. Any thrown failure rolls back every write.

There is no await, network call, upload, sleep or polling inside the callback.
WebCrypto hashes and immutable snapshot preparation occur beforehand. The base
snapshot is read from the requested HEAD; immutable data remains stable while
hashing, and expected HEAD is checked again in the transaction. Two preparations
may compete; only the first matching HEAD can advance. FIFO is not that proof.

Cloudflare storage.sql.exec and transactionSync back the production port.
Node SQLite tests use BEGIN IMMEDIATE/COMMIT/ROLLBACK on real SQLite and the same
authority functions. Local workerd tests additionally execute actual Durable
Object transactionSync through the bundled server worker and reopen persisted
object storage. These prove local behavior, not hosted failure/recovery guarantees.
There is no cross-SQLite/R2 atomicity or distributed transaction manager.

## Scheduling, cancellation and payload ownership

The owner composes the existing scheduler with a private map capped at the same
outstanding capacity (8 default, maximum 32). A slot owns a validated copied
payload/context; the FIFO descriptor contains only IDs and an opaque random
64-hex lookup reference. No source text is retained in ring slots or events.
Preparation/hashing runs only for the active executor. Quota/permission/input
rejections are typed executor outcomes, not fabricated successful commits.

Queued cancellation releases its map slot without executing it. Active payloads
remain until the real executor settles, even when the public waiter has already
resolved unknown. Executor finally removes its slot on every exit. A DO uses
ctx.waitUntil on the in-flight authority promise to request continued local
execution lifetime after caller cancellation; this is not durable job acceptance
or a guarantee that a runtime cannot terminate. Application timers/deadlines do
not interrupt synchronous SQL. No owner/executor is replaced while it may run.

Cancellation can occur during a transaction that subsequently commits. Public
503/cancellation is therefore uncertain, never a rollback claim. Retry/query the
same actor/repository/key; successful replay is durable across owner recreation.
Unsuccessful outcomes do not reserve keys. Worker restart loses only transient
scheduling, payloads and events; persistent HEAD/metadata/receipts remain.

## Concurrency invariants

- **COMMIT-001:** only the repository SQL authority advances HEAD.
- **COMMIT-002:** owned pending requests/payloads include active work and never
  exceed configured capacity. No capacity waiter or unbounded preparation pool.
- **COMMIT-003:** admission never overwrites; diagnostic eviction cannot lose a
  queued request. Cancellation settles explicitly.
- **COMMIT-004:** expected HEAD, immutable metadata, successful replay, counters
  and HEAD advancement share one synchronous transaction.
- **COMMIT-005:** admission deadline, abort, bounded input/query/storage budgets;
  synchronous work cannot be forcibly cancelled and unknown completion is fenced.
- **COMMIT-006:** no transaction/lock spans queue wait, hashing, sleeps or network.
- **COMMIT-007:** scheduler/events remain ephemeral and nonauthoritative; commits,
  replay and HEAD are persisted. There is no durable job queue.
- **COMMIT-008:** durable actor/repository/key+digest replay prevents duplicates
  after uncertain responses; pending request-ID deduplication is not the ledger.

## Verification and limitations

Local evidence distinguishes Node SQL rollback/fault injection, pure scheduler
interleavings, and actual bundled server HTTP + workerd SQLite DOs. Test-only
JWT keys exercise the real SDK verifier. Hosted auth, browser login, platform
quota/pricing and production serving remain unverified. The official Vite
production build still rejects the unregistered app-ID placeholder; the local
server test bundle is not a production artifact or replacement build path.
No CI functionality or new CI lane was implemented. Local incoming-body
concurrency, app-wide repository cardinality/rate caps and physical DB/CPU/credit
limits are not guaranteed by the per-repository logical budgets.

References: [DeepSpace architecture](https://docs.deep.space/concepts/architecture),
[SDK auth](https://docs.deep.space/sdk-reference/worker/auth),
[SQLite transactions](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/#transactionsync),
[Miniflare DO tests](https://developers.cloudflare.com/workers/testing/miniflare/storage/durable-objects/).
Installed declarations are authoritative where documentation lags.
