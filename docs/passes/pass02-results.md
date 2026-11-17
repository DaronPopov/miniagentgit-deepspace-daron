# Pass 02 results

Status: free-tier invariants, typed API/application seams, identity adapter, and
repository lifecycle/schema preparation implemented. **Full validation remains
blocked by the preserved SDK app-ID build gate.** No repository operation or
atomic commit implementation is claimed.

## Revisions and workflow

Starting SHA and current final HEAD:
`e8644c633a88fc26cd64cd767c92c778533565d9` on `main`.
The checkout started clean. Pass 02 changes are staged for review, not committed
or pushed: the instruction permits only validated work, and production build
validation cannot complete without expressly authorized registration. The same
SHA therefore remains HEAD; it does not contain these staged changes.
No unrelated work was overwritten. No registration, deployment, fabricated app
ID, cloud operation, paid integration, or credit-consuming runtime test ran.

Read AGENTS.md, engineering standards, Pass 01 results, and current official
SDK/Cloudflare docs before editing. The initial `npm run validate` passed type,
lint, formatting, size, and six tests, then failed at the known app-ID gate.
The user subsequently supplied the original Pass 02 requirements; both those
and its free-tier amendment are reflected in this work.

## Versions and APIs verified

No dependency or lockfile change. Environment: Node 24.18.0, npm 11.16.0;
DeepSpace SDK/CLI 0.44.2, TypeScript 5.9.3, Hono 4.13.19, Vitest 4.1.12,
Cloudflare Vite plugin 1.69.1, workers-types 5.20261117.1, Wrangler 4.164.0.
See Pass 01 for the remaining unchanged versions.

Inspected installed deepspace/dist/worker.d.ts, index.d.ts, worker.js and
Cloudflare workers-types. Verified `verifyJwt`'s `{ result, error?, debug? }`
envelope, issuer/key/audience options, `readBoundedBodyText`, BodyTooLargeError,
DOManifest, RecordRoom's private SQL internals, and browser useAuth signature.
Also inspected records/providers/query/mutation types, server actions and
appFiles: documented equivalents, not additional live features. Cloudflare's
DurableObject, namespace idFromName/get, storage.sql.exec and transactionSync
supply the custom repository owner lifecycle and SQLite boundary.

References and exact integration decisions are in
[architecture](../architecture.md). Quota research and source discrepancies are
in [free-tier budget](../free-tier-budget.md). No DeepSpace Free quota is inferred
from the operator's unknown underlying Cloudflare plan.

## Implemented contracts and adapters

- Readonly repository/principal/file/manifest/commit/HEAD/idempotency contracts
  and typed success/error results including QUOTA_EXCEEDED.
- Shared operation interfaces for all ten requested operations; a read port
  and sole future commitPrepared mutation seam. No success stub implementations.
- Scalar, create, commit, restore, and page validators; traversal/ownership-field
  rejection; streamed JSON byte guard; text/change/message/page limits.
- Lower-only configurable frozen resource budgets. No durable counter, creation
  admission, rate/concurrency, CPU, physical-storage or credit enforcement claim.
- Actual SDK JWT verification behind GET /api/me; missing trusted configuration
  fails closed. Subject-only results, no claims/debug logging or caller roles.
- Unmounted browser useAuth identity hook; no custom OAuth or browser login flow.
- Canonical validated repository owner name and namespace routing adapter.
- Custom RepositoryRoom lifecycle, SDK/Cloudflare manifest, and SQLite schema
  DDL. No public repository ingress, commit RPC, alarm, or background workload.
- Exact 300-line adapter allowlist; ordinary src/server and storage modules
  retain 185. Tests prove unclassified API paths also default to 185.
- Static import graph test for relative import cycles and domain isolation.

## Persistence and security guarantees

One logical repository maps to one app-private Durable Object name, without
actor-dependent routing. Only the future authority may advance HEAD. The
current code never inserts or advances HEAD. Initial SQL defines singleton
metadata/HEAD, commits, immutable-content candidates, manifest and idempotency
tables with keys, foreign keys and counter checks. The lifecycle constructor
runs only idempotent DDL in transactionSync; it has not run on Cloudflare.

Future commit protocol rechecks stored authorization, idempotency digest,
expected HEAD and retained-data quotas in the same synchronous SQL transaction
as metadata, manifest, retry record, counter and HEAD writes. Hashing/preparation
may occur beforehand. No await/network operations inside it. No cross-SQLite/R2
atomicity, generic SDK mutation atomicity, or distributed transaction claim.
Content immutability and durable quotas are planned authority rules, not
implemented database triggers or atomic engine behavior.

Authentication and authorization are distinct. Owner policy consumes stored
metadata; callers must not inject it. API tokens are design only. Trusted JWT
key/issuer/audience must be verified against actual app-issued tokens before
hosted use; no audience was guessed. CLI sign-in does not authenticate app users.

## Final validation evidence

Executed `npm ci --no-fund --no-audit`, then `npm run validate` from the clean
installation. No cloud test commands were used.

| Command                       | Result                                                     |
| ----------------------------- | ---------------------------------------------------------- |
| `npm ci --no-fund --no-audit` | PASS                                                       |
| `npm run type-check`          | PASS                                                       |
| `npm run lint`                | PASS, zero warnings                                        |
| `npm run format:check`        | PASS                                                       |
| `npm run check:size`          | PASS, 38 tracked source/test/config files, zero violations |
| `npm test`                    | PASS, 9 files / 23 tests                                   |
| `npm run build`               | BLOCKED, exit 1: **APP_ID** is not a registered app ID     |
| `npm run validate`            | EXIT 1 at preserved build gate                             |
| `git diff --cached --check`   | PASS                                                       |

Focused evidence: real locally signed ES256 JWTs verified by the SDK; wrong
issuer/audience/expiry/anonymous/forged/missing token rejection; spoofed identity
headers ignored; absent config fails closed. Resource tests cover invalid/lowered
config, exact byte boundaries, multibyte UTF-8 excess, aggregate text, change and
message caps, malformed JSON/media types, and a streamed oversized request with
a lying Content-Length. Contract tests cover IDs, paths, duplicate changes,
client ownership injection, malformed text, owner policy, restore and page bounds,
and deterministic owner names. Checker CLI tests use a real temporary Git repo
and prove nonzero violation exits. Static imports are checked for cycles and
domain framework dependencies.

DDL tests use real **Node local SQLite**, verifying valid/idempotent schema,
foreign keys, singleton and nonnegative HEAD-version constraints. They are not
mocked successful transactions and do not prove Durable Object lifecycle,
rollback under concurrent clients, hosted atomic commit behavior, or deployment.
No browser runtime or production bundle was validated. Node's SQLite API is
experimental; the production implementation uses Cloudflare SQLite instead.
A targeted tracked-content credential-pattern review found no credentials; this
is not an exhaustive external secret-scanner/security audit.

## Remaining work and risks

Actual SQLite/DO/request/CPU/billing quotas remain unknown. The first workflow
estimate is documented with assumptions, not measured CPU or credits.
No app registration, hosted quota discovery, runtime smoke test or build gate
bypass was attempted. No new size exceptions or dependencies.

Deferred: all repository operation implementations, atomic commit logic,
durable quota counters/admission, token issuance, browser auth/proxy wiring,
actual app audience verification, realtime subscriptions, blob uploads, data
migrations beyond initial DDL, and hosted concurrency/failure qualification.
A clean production build could reveal further issues after registration; do not
call Pass 01 or Pass 02 fully production-verified until that gate passes.
