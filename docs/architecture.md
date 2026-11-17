# MiniAgentGit architecture

## Scope and boundaries

Pass 04 implements a local repository vertical slice: create/read repository,
empty/read HEAD, immutable text commits, tree/file/commit retrieval and durable
successful replay lookup. HTTP → verified transport → application service →
canonical RepositoryRoom → synchronous SQLite authority. No mutable HEAD exists
in HTTP or the scheduler. No branches, merges, Git protocol, binaries, R2, MCP,
restore/diff engine or arbitrary code execution are implemented.
Pass 05 adds durable commit-addressed fixed CI; see the CI section below.

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
Fixed CI now has local evidence described below; no hosted CI lane was created. Local incoming-body
concurrency, app-wide repository cardinality/rate caps and physical DB/CPU/credit
limits are not guaranteed by the per-repository logical budgets.

References: [DeepSpace architecture](https://docs.deep.space/concepts/architecture),
[SDK auth](https://docs.deep.space/sdk-reference/worker/auth),
[SQLite transactions](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/#transactionsync),
[Miniflare DO tests](https://developers.cloudflare.com/workers/testing/miniflare/storage/durable-objects/).
Installed declarations are authoritative where documentation lags.

## PASS 05: durable commit-addressed validation

The canonical repository owner now hosts a separate CI application engine and
migration-3 CI tables. HTTP → verified identity → repository authorization →
transactional durable admission → bounded asynchronous fixed validator → fenced
receipt transaction. No new object, broker or process-global authority is added.
CI never changes HEAD or immutable commit rows. The pending SQL index is its
queue; the existing in-memory commit ring is not a durable CI receipt.

Follow **CI-001 through CI-010** in [CI pipeline](ci-pipeline.md), including the
state diagram, version/fingerprint identity, bounds, cancellation and recovery.
Request-driven recovery on authorized access is implemented and tested across
local runtime recreation. waitUntil is best effort; no unattended recovery claim
is made. Terminal identities cannot be deleted; admission fails honestly at the
retained-record/byte cap. Fixed checks are manifest integrity and source policy;
TypeScript syntax/type checking and arbitrary execution are not provided.

## PASS 06A: public frontend foundation

`src/pages/index.tsx` only composes ProductFoundation. The existing browser root
and Generouted lazy route discovery are unchanged. The public feature owns
`contracts/`, `components/`, `content/` and ordinary CSS `styles/` under
`src/features/product-site/`. No additional application root, server, package,
provider, SSR or Dynamic Worker is introduced. Presentation metadata is separate
from repository/commit/identity/CI contracts and carries no authorization rules.

- **UI-001:** routes compose features; no backend logic in public route modules.
- **UI-002:** public feature imports React and its own presentation modules; only the
  dedicated SiteIcon boundary may additionally import static named Lucide icons;
  server, SQL, Durable Object, Hono and server-only SDK dependencies are forbidden.
- **UI-003:** readonly typed props, explicit local state when needed; no state
  is needed for the foundation.
- **UI-004:** public presentation cannot import dashboard/auth-ui or the existing
  `src/client/identity.ts` credential adapter.
- **UI-005:** container, section, header and code placeholder know no repository
  state or authentication.
- **UI-006:** no public initialization network requests, effects or SDK providers.
- **UI-007:** no mutable module store or class hierarchy.
- **UI-008:** Vite statically bundles browser modules; lazy chunks are static
  assets, not request-time rendering or Dynamic Workers.

Tracked-source AST tests enforce the public dependency allowlist, re-exports,
dynamic-import prohibition, readonly properties, no shared mutable state and
network/effect capability exclusions. Negative fixtures prove rejection of server,
SDK, dashboard and identity imports. Existing project-wide cycle tests cover the
new modules; a browser-target esbuild test checks the route dependency graph.
React static markup tests are test-only, not a production SSR path. PASS 06A did not verify rendered browser layout/focus; PASS 06B adds the
local client-only smoke evidence described below. The official production bundle
remains unverified behind the unchanged app-ID gate. Future onboarding/auth/dashboard features remain separate;
none is implemented here.

## PASS 06B: static public landing page

The public feature now composes a hero, capability cards, commit/CI explanations,
two inline SVG lifecycle diagrams, repository documentation links and a footer. The five-line route, root/router, tokens and
backend are unchanged. Typed copy lives in landing/workflow/diagram content;
no repository/CI data, credential adapter or authentication provider is mounted.
Navigation contracts additionally permit HTTPS documentation/source links.

The commit diagram identifies repository persistence as the only HEAD writer;
the CI diagram identifies SQLite as durable job state and CI as a reader of
immutable snapshots. Each SVG has unique React useId title/description/marker IDs
and an accessible long description; vertical stages remain readable on phones.
Only desktop widths place both diagrams side by side. The CI diagram ends at the agent retrieving its result. No generic graph/layout dependency is introduced.

All UI invariants remain enforced. Local Chrome smoke tests exercised the actual
route component and CSS through a temporary browser fixture, without the SDK,
secrets or server data. This establishes local render/focus/network behavior,
not production Vite routing, hosted authentication or deployment. See
[PASS 06B results](passes/pass06b-results.md) for viewport and bundle measurements.
The page describes existing product capabilities without project-scope, delivery
status or release-version copy. Verification details and limitations remain in
engineering documentation; no Git wire protocol or arbitrary execution is advertised.

## PASS 06B.1: bounded icon presentation

The existing page, content order, links and two SVG architecture lifecycles remain
unchanged. Trusted display metadata can select one of ten semantic icon names;
SiteIcon maps those names to ten static named imports from lucide-react 1.74.0.
No icon namespace, dynamic loader, remote asset or generalized registry exists.
The narrow public import policy permits that package only in SiteIcon. Icons are
aria-hidden and nonfocusable; existing visible labels carry accessible names.
CurrentColor, token spacing, 20px optical size (16px in compact navigation), and
1.75 stroke width preserve the existing light/dark visual language. No new
provider, app state, request, backend operation or deployment is introduced.

The reproducible local client-only measurement is
`node scripts/measure-public-bundle.mjs`; it is not the gated production Vite
bundle. See [PASS 06B.1 results](passes/pass06b1-results.md) for compatibility,
locked dependency changes, before/after measurements and Chrome smoke evidence.

## PASS 06C: public onboarding

`src/pages/docs.tsx` composes the dedicated onboarding feature. Its static guide
and eleven HTTP request descriptors generate separate Windows PowerShell and
curl.exe command modes. Existing product primitives/tokens/icons are reused via
an exact import allowlist; the product site links to `/docs` without importing
onboarding. Only an explicit copy-button click invokes write-only clipboard
access. No public initialization calls protected APIs or reads auth state.

An exact GET /docs asset mapping serves the existing client shell for direct
navigation under Wrangler's non-SPA asset-miss policy. Repository APIs, authority,
SQLite, CI, JWT verification and app-ID gate are unchanged. Full boundaries and
DOCS-001–DOCS-010 are in [product-site.md](product-site.md).

## PASS 06D: route-scoped authentication

The static `/dashboard` shell owns the SDK provider and its session client.
Public routes remain provider-free. Protected reads verify the API principal,
fence session changes and bound unsettled executions; no repository data is
loaded by the shell. Canonical repository rooms and persistence code are unchanged.
See [authentication architecture](authentication-architecture.md) for AUTH-001–010,
real multi-user isolation evidence and the unconfigured hosted auth proxy/token
trust boundary. Browser integration is locally tested; hosted login is not qualified.

## PASS 06F deployment qualification

The official production build now uses the assigned registered app ID without
weakening its guard. One deployment serves the public static React frontend and
canonical repository rooms. The browser-only managed auth adapter precedes the
API fallback and implements the verified scaffold redirect/cookie/token routes;
no generic SDK record, job, integration or realtime routes were exposed.
JWT verification and repository/CI persistence are unchanged. Hosted smoke tests
using an existing OAuth session exercised the actual token bridge, principal,
immutable commit/replay and CI receipt. Prior unregistered/local-only statements
are historical; see [PASS 06F evidence](passes/pass06f-results.md) for exact hosted
qualification limits. Interactive OAuth and multi-user hosted evidence remain
separate from local isolation tests.

## PASS 06H: static agent connection flow

The owner has undeployed the app; previous hosted evidence is historical and the
old URL is not treated as active. No registration, deployment or cloud probe runs
in this pass. The registered app ID and backend authority are unchanged.

The public route composes an independent agent-onboarding feature below the hero
via an explicit layout slot. HTTP requires deployment/configuration; Codex and
Claude Code remain planned with no install commands. The feature reuses only
existing command descriptors/generation and CodePanel, never the documentation
route. Native local selection state causes no network traffic. See
[product-site contracts](product-site.md) for AGENT-UI-001–010 and the narrow
import direction; [PASS 06H results](passes/pass06h-results.md) records evidence.

## PASS 08A: qualified read-only agent tool

The server mounts the installed SDK registerAgentToolTransports for one tool,
miniagentgit.repository_head. A request-scoped reader forwards the original
verified Bearer to the existing canonical owner HEAD route. No persistence,
HEAD/CI, schema, scheduling or public frontend code changes. Native REST and the
installed SDK's stateless MCP subset are tested locally; no custom MCP server or
new dependency exists. CLI scoped credentials remain rejected by the unchanged
repository authentication policy; Codex/Claude compatibility is not claimed.
See [agent-tool architecture](agent-tool-architecture.md) for the capability matrix,
TOOL-001–010, exact APIs, limits and qualification blockers. The app stays undeployed.

## PASS 08B: scoped agent HEAD admission

The dedicated agent-tool policy now also accepts SDK-verified, origin-bound
agent JWTs. Only exact signed-account/persisted-owner equality authorizes HEAD;
no independent-agent-to-human delegation is invented. The original credential
is reverified through an app-private binding-only GET/head path by the canonical
RepositoryRoom before the existing readHead service runs. Ordinary user API
policy, SQL, CI and ownership remain unchanged. See
[agent-tool trust model](agent-tool-architecture.md#pass-08b-scoped-credential-trust-model-supersedes-the-08a-blocker).
Codex/Claude panels explain local qualification but remain unavailable while
undeployed; no installation command or actual coding-client/hosted compatibility
claim is enabled. No additional tools or deployment were added.
