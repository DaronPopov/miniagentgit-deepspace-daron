# MiniAgentGit architecture

## Invariants and present scope

**FREE-TIER-001:** operate the bounded takehome service within one DeepSpace
Free-plan deployment. See [resource budgets](free-tier-budget.md) for reported
allowances, unknown quotas, implemented validation, and planned durable controls.
No registration, deployment, credit consumption, fabricated identity, paid
integrations, or background work is authorized by this pass.

Target flow: authenticated HTTP / future MCP adapter → application functions →
repository-scoped authority → SQLite. All repositories share one app deployment;
a deployment slot is not a repository. Optional immutable blob storage is deferred.
Use ordinary functions and explicit typed contracts; classes exist only for
SDK/Cloudflare lifecycle wiring. No service manager or plugin framework.

Current implemented surfaces are `GET /api/health` and `GET /api/me`. The latter
returns only a verified subject; it is not an authorization grant. Repository
operations are interfaces and validators, not published success stubs. Unknown
API paths continue to return 404. A future adapter must authenticate, bound the
body, validate identifiers/payloads, invoke one shared application operation,
and map typed outcomes. Proposed mappings are INVALID_INPUT → 400,
UNAUTHENTICATED → 401, FORBIDDEN → 403, NOT_FOUND → 404, CONFLICT → 409,
QUOTA_EXCEEDED → 413 for payload size / 429 for admission, UNAVAILABLE → 503.
These mappings are planned except the implemented identity endpoint's 401/503.

## Authentication and authorization

`src/server/deepspace/auth.ts` uses the actual SDK `verifyJwt(config, token)`
returning `{ result: { userId, claims } | null }`. Accept only a bounded Bearer
token, verify public key, issuer, and audience from trusted deployment config,
require expiration, and reject anonymous subjects. Missing trusted configuration
returns UNAVAILABLE. Tokens, claims/debug data, and email are not logged or
returned. No client header/body ownership or role claim is trusted.
`AUTH_JWT_AUDIENCE` must be verified against the app's real issued tokens before
runtime use; no value is guessed or inserted into wrangler.toml.

Browser identity is prepared via SDK `useAuth()` in `src/client/identity.ts`.
The hook is deliberately unmounted in the static shell, so it makes no session
request there. It reports display state only. Browser session cookies are not
accepted as a Bearer token by our server verifier. Platform auth proxy and token
retrieval wiring remain deferred; CLI login authenticates the developer CLI,
not browsers or arbitrary clients of MiniAgentGit. No custom OAuth endpoints.

`Principal` carries the verified user subject. `authorizeOwner` uses persisted
repository metadata, separately from authentication; initially all repository
permissions are owner-only. Future authority methods must recheck this against
their own stored metadata, not caller-supplied metadata. Platform app membership
or an app-wide admin role is not repository ownership.

Future scoped API tokens: server-generated high-entropy secret; store only its
hash, token ID, bound user/repository, expiry, revocation state, and explicit
read/write/restore scopes. Resolve subject server-side; intersect scope and
current repository authorization on every call. No token issuance/storage,
verification route, or DeepSpace agent-token reuse is implemented. Never send
trusted identity in WebSocket URLs or use SDK action headers as authorization.

## Contracts and layers

`src/domain/` contains serializable readonly repository metadata, principal,
file changes/manifests, commit metadata, HEAD, IDs, and discriminated results.
Expected errors include INVALID*INPUT, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND,
CONFLICT, QUOTA_EXCEEDED, and UNAVAILABLE. String aliases are not nominal proof
of validation: every untrusted boundary must run validators. Repository IDs
are lowercase `repo*` plus 16–32 alphanumerics; commit/content IDs will use
64 lowercase hex SHA-256 characters. ID generation/hashing is deferred.

`src/application/operations.ts` defines create/read repository, read HEAD,
list tree, read file, create commit, history/details, diff, and restore seams.
All scoped operations carry a verified actor and repository ID; listing/diff
returns bounded cursor pages. Restore creates a new commit from an existing
snapshot; it does not rewind history. It carries expected HEAD and idempotency.
No operation implementation is registered. Typed read and commit-authority ports
are in repository-authority.ts; no general setHead or raw SQL escapes the owner.

Validation covers create/commit/restore payloads, IDs, relative paths, page
limits/cursors, duplicate changes, unknown fields, and bounded text.
`readJsonRequest` uses SDK `readBoundedBodyText` before parsing. Future path and
query parameters must use the same scalar validators after decoding; do not
accept raw unbounded query values. No endpoint consumes those payloads yet.
HTTP and future MCP must share these application operations and policies.

## Repository persistence ownership

One logical repository maps to `repo:<validated repository ID>` using
`REPOSITORY_ROOMS.idFromName(name)` and `get(id)`. The binding's namespace is
app-private; no name comes directly from an unvalidated route. No random
`newUniqueId`, actor-dependent suffix, or secondary writable owner. Validated
names are deterministic; actual Cloudflare routing has not been executed.

The installed `RecordRoom` extends SDK `BaseRoom` and exposes generic records,
RBAC, queries, mutations, and WebSocket sync, but keeps SQL/schema internals
private. Its public types expose no multi-record transaction callback. Multiple
SDK mutations/server actions cannot be assumed to atomically insert commit,
manifest, retry record, and HEAD together. Do not repurpose those mutations as
the repository commit engine or allow the generic records API to mutate HEAD.

Smallest supported alternative: custom Cloudflare `RepositoryRoom extends
DurableObject`, exported in worker.ts and registered in the SDK `DOManifest`
with `sqlite: true` and matching Wrangler binding/migration. DeepSpace's manifest
accepts arbitrary exported class names; Cloudflare supplies the lifecycle and
SQLite API. The lifecycle constructor runs schema DDL in
`state.storage.transactionSync`. No public repository route, SQL endpoint,
WebSocket, alarm, or commit method exists. Its internal fetch returns 501.
The six original SDK classes remain inert framework wiring, not repository
owners; no rooms are fetched or activated by this pass's tests.

Initial tables: repository singleton, commits, singleton mutable HEAD, immutable
file_contents, manifest_entries, and actor-scoped idempotency records. Keys,
foreign keys, nonnegative counters, and singleton checks are declared. Content
and commit immutability are **planned authority rules**, not SQL triggers.
DDL initialization is idempotent CREATE IF NOT EXISTS; versioned schema upgrades
will need explicit migration design before changing existing databases.
No repository row, content, commit, or HEAD is inserted by initialization.

## Future atomic commit protocol

Outside the transaction: authenticate; validate and bound the complete request;
normalize paths; hash canonical semantic request and content; prepare immutable
text/manifest metadata. Independent hashing and bounded reads may run
concurrently. Do not keep database locks across network calls or awaits.

Inside one repository owner's **synchronous** SQLite transaction:

1. Read stored identity/ownership and reauthorize the actor; verify the routed
   repository matches persisted ID. Do not bind it from an arbitrary first write.
2. Look up `(actor_subject, idempotency_key)`. Same digest returns the prior
   commit; different digest returns CONFLICT. Replay precedes stale-HEAD rejection.
3. Read actual HEAD and compare expected commit/version, returning CONFLICT
   without writes if stale. Compare-and-set HEAD as a defensive final check.
4. Compute resulting tree and retained-byte/file/commit counters from stored
   state, rejecting QUOTA_EXCEEDED before inserting anything.
5. Insert missing immutable contents, commit metadata, manifest, and retry
   record; advance HEAD and counters exactly once. Any failure rolls back all.

Only this owner operation may advance HEAD. No split read/check/write across
awaits, no transport mutation, no cross-object transaction. Failures after an
uncertain response are retried with the same idempotency key and digest;
never assume a timeout means rollback. Bound retained idempotency to retained
commits; fail closed at the cap rather than silently expiring replay safety.

Cloudflare documents `transactionSync(callback)` rollback on throw; it cannot
include async work, and nested transactions use savepoints. SQL statements
outside it have implicit transaction behavior, which is not a substitute for
an explicit multi-statement commit boundary. The SDK's generic record operations
provide no additional guarantee here. Local SQLite DDL tests validate schema
syntax/constraints only, not hosted transaction scheduling or atomic commits.

Optional R2 writes, if later justified, happen as immutable preparation before
the SQLite transaction. The SQL commit references only confirmed content;
unreferenced blobs may remain on failure. There is **no SQLite/R2 atomicity**,
no distributed transaction manager, and no background blob cleanup now.

## Verified SDK equivalents and deferred features

| Concern                       | Verified API                                                              | This pass                                                   |
| ----------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Browser identity              | `useAuth()` from deepspace                                                | Unmounted typed hook                                        |
| Server identity               | `verifyJwt` from deepspace/worker                                         | Used by GET /api/me                                         |
| Bounded body                  | `readBoundedBodyText`, `BodyTooLargeError`                                | Tested request adapter                                      |
| Records / queries / mutations | `RecordRoom`, `RecordProvider`, `RecordScope`, `useQuery`, `useMutations` | Inspected types; not used for repository state              |
| Realtime                      | RecordScope WebSocket + SDK room lifecycle                                | Deferred; no subscription required                          |
| Server actions                | `ActionHandler`, `ActionTools`; scaffold Hono routes                      | Inspected; Hono retained, no bypass headers or action route |
| Blob storage                  | `appFiles(env, {scope, userId})`                                          | Inspected; unused, no upload                                |
| Custom SQLite owner           | `DOManifest`, Cloudflare DurableObject, storage.sql.exec, transactionSync | Lifecycle wiring + DDL only                                 |

References: [SDK auth](https://docs.deep.space/sdk-reference/worker/auth),
[rooms](https://docs.deep.space/sdk-reference/worker/rooms),
[client records](https://docs.deep.space/sdk-reference/client/records),
[server actions](https://docs.deep.space/sdk-reference/worker/server-actions),
[SQLite transactions](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/#transactionsync).
Installed types are authoritative for DeepSpace 0.44.2. This is not hosted
runtime, transaction atomicity, or production bundle verification.
