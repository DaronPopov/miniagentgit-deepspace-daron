# Free-tier resource budget

## FREE-TIER-001

MiniAgentGit must remain operable as a bounded takehome demo on **one DeepSpace
Free-plan deployment**. This is a design invariant, not a certification that
hosted operation or future pricing is guaranteed. No paid integrations, external
AI calls, background polling, cron tasks, or unnecessary background workloads.
No registration, deployment, or credit-consuming test without explicit user
authorization. Preserve the official production build gate and `__APP_ID__`.

## Allowance evidence and separate limits

Investigated 2026-11-17 using official docs and installed DeepSpace 0.44.2 types
and implementation. Earlier read-only account checks in this conversation
reported Free, 500 available credits, zero used, zero apps, and no renewal date.
The dashboard advertised 500 credits/month; the SDK's `DEPLOYED_APPS_DEFAULTS`
sets Free to one app. These are currently reported allowances, not promised
future pricing or a verified renewal schedule. No further account calls or
billable operations were needed for this amendment.

| Resource                   | DeepSpace evidence / app entitlement                                                                               | Decision                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Deployment slots           | Currently reported one; server overrides may differ                                                                | One app for all repositories; no preview app per repository                      |
| Credits                    | 500 monthly advertised; account had 500 remaining, renewal null                                                    | No assumption that compute/storage are unmetered; no paid integrations           |
| Uploaded files             | Official guide says 128 MiB per app; actual app quota unknown                                                      | Conservative 128 MiB ceiling; text workflow uses zero uploads                    |
| Deploy assets / releases   | Separate allocation from uploaded files; SDK account storage table says Free 1 GiB and repo store constant 256 MiB | Not repository content quota; actual app/account entitlement unknown             |
| SQLite database bytes      | Repository SQLite is inside its Durable Object; no DeepSpace Free per-repo or per-account SQLite cap found         | Unknown; 8 MiB logical repository limit enforced, not a physical DB guarantee    |
| SQLite rows / operations   | No DeepSpace Free row/read/write allowance or credit conversion found                                              | Unknown; bound query pages and transactions before enabling writes               |
| Durable Objects            | Manifest permits SQLite DOs; provider-owned Workers for Platforms namespace                                        | DeepSpace Free object count, active-object cost, request/duration quotas unknown |
| HTTP and DO requests       | No DeepSpace Free daily/monthly/rate entitlement found                                                             | Unknown; bounded owner admission implemented; rate limits deferred               |
| CPU and memory             | No per-app DeepSpace Free CPU allowance or compute-to-credit conversion found                                      | Unknown effective CPU; bound input and queries, then measure after authorization |
| R2 / optional blob storage | Standard files gateway has active-content restrictions and owner quota                                             | Do not use for repository text now; no new R2 binding                            |

Sources: [DeepSpace architecture](https://docs.deep.space/concepts/architecture),
[file storage](https://docs.deep.space/guides/file-uploads#file-size-and-storage-limits),
[custom bindings](https://docs.deep.space/guides/custom-bindings),
[account usage command](https://docs.deep.space/cli-reference/commands#app-usage),
and [dashboard](https://dashboard.deep.space/billing). The file-storage guide
also specifies 25 MiB per upload request and multipart support; those provider
capabilities do not authorize their use here. SDK constants are implementation
hints, not a substitute for actual quota responses. Never combine the uploaded
file, release, database, and account allocations into one purported allowance.

Cloudflare's direct Workers Free plan lists 100,000 requests/day, 10 ms CPU per
HTTP invocation, and 128 MB isolate memory. **DeepSpace Free is not Cloudflare
Workers Free**: DeepSpace operates the hosting account, so these are upstream
reference values, not our entitlement. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)

Upstream SQLite DO docs list 100 bound SQL parameters, 100 columns, and an 8 MB
row/string/blob ceiling. The page's table lists 10 GB/object, while its full-disk
section distinguishes 1 GB Free and 10 GB Paid; account-plan limits also differ.
DeepSpace's underlying plan/configuration is unverified. No such maximum is
claimed for this app. [DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/)

## Application budgets and enforcement status

`src/application/resource-limits.ts` defines frozen defaults. `configureLimits`
accepts positive safe-integer overrides only at or below these defaults. Future
composition roots must pass the resulting limits explicitly; no hidden process
configuration or mutable global counters. Raising ceilings requires a reviewed
budget revision, not an arbitrary environment variable.

| Budget                              | Default                        | Implemented status                                                                         |
| ----------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------ |
| JSON request body                   | 256 KiB                        | `readJsonRequest` checks media type and uses SDK streamed byte limiter before JSON parsing |
| One file's UTF-8 text               | 32 KiB                         | Enforced by `validateCommit`                                                               |
| Changes per commit                  | 16                             | Enforced by `validateCommit`                                                               |
| Total put text per commit           | 128 KiB                        | Enforced by `validateCommit`                                                               |
| Commit message                      | 1 KiB                          | Enforced by `validateCommit`                                                               |
| Page size                           | 25                             | Enforced by `validatePage`                                                                 |
| Files per repository                | 128                            | Enforced in the commit transaction against the full resulting snapshot                     |
| Commits per repository              | 100                            | Enforced using the durable HEAD version in the commit transaction                          |
| Logical repository bytes            | 8 MiB                          | Enforced retained logical accounting; physical SQLite usage remains unknown                |
| Repositories per app                | Demo target 4                  | PLANNED app-wide creation admission; not a configured/enforced counter                     |
| Concurrent mutations / request rate | No exposed mutations           | Bounded scheduler/payload admission implemented; ingress/rate limits unimplemented         |
| CPU / physical DB bytes / credits   | Unknown effective platform cap | Measurement and provider observability PLANNED; no local enforcement claim                 |

Quota failures are typed `{ ok: false, error: { code: 'QUOTA_EXCEEDED',
resource, maximum, actual? } }`. `actual` is omitted when the SDK body limiter
reports only the threshold; never invent a measured count. Invalid config or
measurements yield `INVALID_INPUT`. These validators are executable and tested,
and repository endpoints now use them. Durable quotas are checked again inside
the authority transaction; they are not a physical/provider quota guarantee.

Accept only well-formed text without NUL for file content; this is a text API,
not a complete binary-content detector. Paths use a deliberately narrow printable
ASCII subset and exclude traversal, empty segments, escapes, and Windows paths.
No archives, binary uploads, arbitrary globbing, unbounded diff/history traversal,
or automatic retries. Exact credit cost and physical database amplification
remain unknown. Lower input limits alone cannot guarantee a CPU or credit cap.

## First end-to-end commit workflow estimate (local workflow now implemented)

Assume one app, one repository, one actor, two distinct ordinary UTF-8 text files of 4 KiB each,
one 128-byte message, and six sequential calls: create repository, read HEAD,
create commit, list tree, read one file, read commit metadata. Assume no retries, no UI
asset fetches, no auth-provider round trips, no subscriptions, no high-density JSON escape characters, and no R2 writes.

- 6 external HTTP requests and approximately 6 owner dispatches. Actual internal
  platform authentication and metering subrequests are not measured.
- 8 KiB new content; two manifest entries; one commit row; one HEAD row; one
  idempotency row; one repository row; one snapshot-hash row; one creation-receipt
  row; and one schema-migration marker (11 rows after the workflow).
- Reserve 4 KiB logical metadata for the first commit plus 8 KiB contents:
  approximately 12 KiB logical data. Assume up to 4x for SQLite pages/indexes/WAL
  as a planning reserve: approximately 48 KiB, **not measured physical usage**.
- With full text replacement at the 128 KiB commit ceiling, 100 commits could
  exceed 12.5 MiB before metadata. Therefore the enforced 8 MiB retained-data
  cap must reject writes earlier; the per-commit limit is not a total budget.
- Four demo repositories at the enforced 8 MiB logical cap reserve 32 MiB logical
  data, roughly 128 MiB under the same unverified 4x assumption. This is SQLite,
  not uploaded-file usage, and must not be described as fitting a known SQLite
  entitlement. Initial schema overhead in empty objects is additional.
- Uploaded-file allocation spent: 0 bytes. Background tasks/subscriptions: 0.
  CPU time, SQL rows scanned/written by indexes, billed requests, and credits
  per workflow: **unknown until an explicitly authorized hosted measurement**.

Repository-local quotas, serialized execution, atomic HEAD and successful replay
are now implemented. Before enabling public traffic, add app-wide creation and
ingress/rate admission. Before claiming hosted Free-plan operability:
verify actual app quotas without assuming a Cloudflare plan, then authorize a
small smoke workflow and inspect usage before/after. Unknown billing or quota
behavior must fail closed rather than automatically upgrading or provisioning.

## Pass 03 scheduling budget

Planning inputs remain 500 available credits, one app slot, and conservative
128 MiB uploaded-file allocation; no universal/current entitlement or SQLite
quota is asserted. No billable runtime calls or cloud load tests were made.

Implemented per scheduler: outstanding capacity 8 by default / 32 maximum
(including active), event retention 64 / 256 maximum, and admission-to-completion
deadline 5,000 ms / 30,000 ms maximum. These are constructor-configurable within
bounds. One timer and one caller promise per accepted request; one coalesced
drain microtask; no full-queue waiter, broker, alarm, retry loop or polling task.
Full rejection uses QUOTA_EXCEEDED; no diagnostic eviction affects admission.

Descriptors retain only bounded strings: at most 393 UTF-16 code units each
(786 bytes of code units), or 25,152 bytes at 32 requests, before object, Promise,
controller, timer and allocator overhead. Maximum event IDs use 137 code units
plus sequence and enum fields; 256 events retain roughly 70 KiB of those string
code units before overhead. These are representation budgets, not measured heap
or platform memory guarantees. Frozen snapshots temporarily allocate bounded
copies; callers retaining repeated snapshots/results are outside owner retention.
The scheduler ring itself retains no source payloads or uploaded files. Pass 04
adds the separately bounded private payload ownership described below.

Active cancellation can leave one bounded internal claim retained until executor
settlement. On deadline the scheduler closes; queued public completions settle.
No timer can interrupt blocking synchronous work. Durable quotas, rate limits,
CPU enforcement, provider cost conversion and physical SQLite limits remain
unimplemented/unknown as described above. The existing first commit workflow
estimate is unchanged: scheduling adds local descriptor/event bookkeeping, not
an extra HTTP service, app deployment, SQL write or storage upload.

## Pass 04 durable accounting and prepared payloads

The 8 MiB retained logical counter is initialized with serialized repository and
creation receipt plus a 256-byte reserve. Each new commit charges unique content
rows as JSON `[hash,text,utf8Bytes]` plus 64 bytes each, canonical full manifest
plus 64 bytes per entry, canonical commit metadata, serialized actor/key/digest/ID
receipt and a 256-byte reserve. Charges include JSON escaping and retained old
snapshots; deletion does not refund immutable history. Successful replay adds
zero bytes and no HEAD version. Exact-cap and one-byte-below tests use real SQL.
This deterministic conservative accounting model is not SQLite file/WAL/index
measurement. The old approximate 12 KiB/4x first-workflow planning estimate is
still an estimate, not a measured physical footprint or credit cost.

The owner privately retains at most eight validated payloads by default (32
maximum), each at most 128 KiB put text plus bounded paths/metadata. Worst-case
text budget is 1 MiB UTF-8 at default capacity (4 MiB at maximum), potentially
about twice those bytes as UTF-16 code units, before object/JSON/temporary-hash
and allocator overhead. Only one active preparation runs. Scheduler descriptors
hold opaque random references, never bodies. Queued cancellation releases payload;
active cancellation/timeout retains it until real executor settlement. A callback
failure cannot retire in-flight work early. Incoming body streams are individually
bounded at 256 KiB; aggregate simultaneous ingress is not application-wide capped.
Repository URLs are capped at 2,048 characters. No physical memory guarantee is
inferred from these logical limits.

Local verification now runs actual workerd SQLite-backed Durable Objects with
controlled JWT keys, plus Node SQLite transaction/fault/reopen tests. Test-only
esbuild 0.27.7 and Miniflare 5.20261110.0-beta are explicitly pinned; these versions
were already transitive tooling dependencies, with no production dependency
addition. The local harness disables Cloudflare metadata fetching, uses temporary
persistence directories and disposes its runtimes. No cloud load tests, paid
integrations, app registration, deployment, uploaded files or credit-consuming
runtime calls were used. Actual hosted quotas and usage rates remain unknown.

For the six-call initial workflow, source inspection predicts 12 local signature
verifications (public and owner boundaries) and about 14 synchronous SQL closure
invocations including first schema initialization and authority checks. These
are not measured billed request/SQL units. Path names, JSON escaping and metadata
change accounting charges; escape-heavy text can significantly exceed the simple
12 KiB logical estimate. No credit conversion or throughput claim is made.

## PASS 05 CI budget

FREE-TIER-001 remains: one Free-plan deployment, no paid integration, broker,
container or polling service. Reported 500 credits / one slot and conservative
128 MiB uploaded-file planning values are unchanged, not verified SQLite/DO/CPU
quotas. CI uses existing immutable SQLite text, no uploaded files or R2.

Enforced per owner: outstanding 4, retained jobs 32, reserved logical storage
512 KiB, input 32 files / 32 KiB each / 128 KiB total, diagnostics 16 / 2 KiB,
receipt 8 KiB, attempts 2, one job / 512 KiB charged byte work per drain, two-second
claim deadline, pages 8. Limits can be configured downward; see
[CI pipeline](ci-pipeline.md). Input and work bounds do not establish provider CPU
or memory limits. CI source text is held for one active invocation, not each queued
job; roughly 256 KiB of UTF-16 code units can represent a 128 KiB ASCII snapshot,
before JSON/hash/array/allocator temporaries. This is not a measured peak heap.

A first commit → CI → receipt workflow adds at least two HTTP calls (admission and
receipt; additional status observations optional), one job row and one immutable
receipt. Each job reserves 9,216 logical bytes by default, or 294,912 for all 32
retained identities, plus unmeasured SQLite/index/WAL overhead. Validation reads the
existing content once into a bounded snapshot and hashes/scans it; no second copy
is persisted. Request/claim/completion and authorization use multiple synchronous
SQL closures. These are planning estimates, not billed SQL/request/credit units.
No credit conversion, cloud load testing, app registration or deployment occurred.

When retained identities reach capacity, new identities are rejected and existing
ones replay. No silent cleanup, unbounded receipts, diagnostic source excerpts,
automatic retry loop or extra deployment is introduced. Aggregate repository
cardinality, incoming request rate, physical storage/CPU/memory and provider cost
remain unbounded at app level or unknown. Requests drive recovery after runtime
termination; waitUntil alone does not guarantee background progress.

## PASS 06A public foundation

The frontend adds only static browser modules and local CSS/system fonts, within
the existing single application. No auth provider, SDK data hook, API request,
socket, remote asset/font, background workload or additional deployment is mounted
by the public foundation. This pass adds no runtime dependency or retained server
resource. Static asset delivery still depends on platform pricing/quotas; no new
credit or storage entitlement is inferred. Production bundling remains gated by
the unregistered app ID. No app registration/deployment or hosted tests ran.

## Multi-user authentication budget

All users continue to share one application deployment and its account-wide
allowances. No user-wide Durable Object, database, broker, external auth service
or polling loop was added. The protected shell probes identity only on its own
route/session activation; public pages do not contact authentication endpoints.
A route client bounds unsettled reads to four and token acquisition to one with
four waiters. These browser bounds are not account-wide rate or allocation
limits. Repository cardinality and aggregate tenant resource isolation remain
unimplemented; separate repository rooms do not imply separate free quotas.
Reported 500 credits, one slot and conservative 128 MiB upload planning inputs
remain unchanged and do not establish SQLite/CPU/runtime quotas. No registration,
deployment, hosted request or credit-consuming test was performed.

## PASS 06F observed account and app

On 2026-11-17 the production CLI reported Free tier, 500 available credits,
0 used and no purchased/bonus credits before and after one registration/deploy
and the bounded hosted smoke. There was initially no app; exactly one was
registered and deployed. No upgrade, purchase, add-on, extra deployment slot,
external integration or auto-provisioned binding was requested.

The official files documentation currently describes 128 MiB for Free, while
this app's actual `app files list --limit 1 --json` reports 0 used bytes and a
1,073,741,824-byte limit. Keep the conservative **128 MiB** application planning
budget; the observed discrepancy is not a promise or a SQLite entitlement.
Approximately 421 KiB of client assets and a retained rollback bundle were
uploaded; the files listing does not meter those as uploaded user files.
SQLite, DO, request, CPU and deployment billing rates remain unverified. The
usage summary shows no charge but is not proof of zero future or delayed cost.

Only registration, one deploy and a small smoke workflow were authorized. No
spending-cap or auto-upgrade control was exposed by the inspected CLI usage/help
surfaces; no billing setting was changed. Existing local input, retained-data,
scheduler and CI limits remain in force. There is no implemented app-wide ingress
or repository-cardinality cap. Monitor account usage before expanding traffic;
a paid/slot/credit refusal is a stop condition, not permission to buy or delete
another application. See [PASS 06F results](passes/pass06f-results.md).

## PASS 09A stage scheduling budget

A staged CI job reserves at most 4 KiB of checkpoint data in the existing
repository CI storage budget and has at most two dispatch reservations. The
normal passing path uses two JobRoom alarm invocations, two stage RPC calls
and a repository-local deadline alarm. No periodic cross-repository scan runs.
The stage path may read a bounded snapshot twice. See
[durable CI stages](ci-durable-stages.md) for deadline and accounting details
and [PASS 09A results](passes/pass09a-results.md) for local evidence.
