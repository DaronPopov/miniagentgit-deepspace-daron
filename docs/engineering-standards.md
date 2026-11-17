# Engineering standards

MiniAgentGit is a headless, cloud-native service for coding agents. The React
page is a minimal scaffold shell. Keep one npm package and the official
DeepSpace Vite/Cloudflare integration; introduce dependencies only for an
observed requirement.

## File size policy

Count physical lines, including blank lines and comments. A trailing newline
terminates its line; it does not add another. Handwritten TypeScript/TSX source
and tests have a maximum of **185 lines**. HTTP route handlers, API integration
adapters, and framework-required integration files have a maximum of **300**.
Tests always have a maximum of 185, including tests beside adapters.
Generated code, third-party files, and lockfiles are excluded.

`scripts/check-source-size.mjs` uses `git ls-files -z`, sorted deterministically.
It reads working-tree contents of tracked files, including staged new paths.
Stage new files before local validation. Every scanned file reports its path,
actual count, and maximum. Violations and read/Git failures exit nonzero.

Explicit classification:

| Paths                                               | Maximum |
| --------------------------------------------------- | ------- |
| `tests/**`, `**/*.test.ts(x)`, `**/*.spec.ts(x)`    | 185     |
| `worker.ts`, `vite.config.ts`, `vitest.config.ts`   | 300     |
| Explicit API/framework adapter allowlist in checker | 300     |
| Other tracked `.ts` and `.tsx` files                | 185     |

The checker uses exact adapter paths, never a blanket `src/server/**` or
`src/server/api/**` allowance. Current adapters: `src/server/app.ts`,
`src/server/api/{health,principal,request}.ts`, and
`src/server/deepspace/{auth,repository-room}.ts`. Ordinary server business logic,
`src/server/storage/**` (including schema and routing), and unclassified new
adapters remain at 185. Adding an adapter to the allowlist requires a cohesive
transport/framework responsibility and a matching documentation update.

Exact generated exclusions are `src/router.ts` and `src/modals.tsx`. Vendor
roots are `node_modules/`, `vendor/`, `third_party/`, and build output `dist/`.
No filename pattern silently exempts future generated code. Add an exact path
with its generator and rationale if necessary. There are **no size exceptions**.
Any future exception must document path, reason, approved limit, and removal
condition here and in the checker. Split by cohesive responsibility, never
merely to evade a line-count limit. This is not a JavaScript size checker.

## Programming style

Prefer types, interfaces, readonly data structures, and explicit functions.
Domain logic should be pure. Use discriminated unions for expected outcomes;
unexpected failures may throw. Avoid abstract classes, inheritance hierarchies,
service locators, and speculative factories. Classes are permitted only for
framework requirements or demonstrated lifecycle/encapsulation needs.

No broad `any`, unexplained assertions, or hidden mutable global state.
Dependencies must be explicit. Strict TypeScript and ESLint's recommended
TypeScript rules are baseline enforcement; purity, readonly design, ownership,
and dependency direction also require review. `as const satisfies DOManifest`
preserves literal manifest types while checking SDK compatibility.

## Ownership and boundaries

| Location                                       | Responsibility and allowed dependencies                         |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `src/contracts/`                               | Shared transport-neutral data contracts                         |
| `src/application/`                             | Use cases; contracts, future domain and injected storage ports  |
| `src/server/api/`                              | HTTP parsing/serialization; delegates to application operations |
| `src/server/` and `worker.ts`                  | DeepSpace/Cloudflare assembly and integration                   |
| `src/schemas.ts`, `src/schemas/`               | SDK storage schema declarations; required users schema retained |
| `src/pages/`, `src/main.tsx`, `src/styles.css` | Minimal client shell and file-based routing                     |
| `tests/`                                       | Baseline unit and adapter tests                                 |
| `scripts/`, `docs/`                            | Validation tooling and engineering evidence                     |

Create `src/domain/` with the first domain implementation; it must not depend
on React, HTTP, or Cloudflare SDKs. Put repository persistence adapters under
`src/server/storage/` when persistence is implemented, with application-owned
ports as needed. Do not create empty trees or placeholder services.

Only the repository persistence authority may advance HEAD. Transport code
must not directly mutate repository state. HTTP and future MCP adapters must
share application-level operations. No circular dependencies or cross-layer
shortcuts. The health operation imports only its shared contract. The client
imports no server code. Framework schema declarations are not domain types.

The six original SDK Durable Objects and custom RepositoryRoom are framework
lifecycle wiring, not domain inheritance. No room endpoints are mounted;
tasks/jobs reject execution. RepositoryRoom initializes schema only, and no code
advances HEAD. Identity verification is implemented; repository operations,
browser login flows and MCP remain deferred.

## Validation and changes

`npm run validate` runs strict type checking, ESLint, Prettier check, tracked
source size checks, Vitest, and the Vite production build. CI repeats it after
`npm ci`. Unit/adapter tests do not prove Cloudflare or platform behavior.
Test meaningful positive and negative boundaries when changing behavior.

Keep generated files, node_modules, build output, credentials, and local
DeepSpace/Wrangler state out of Git. Use platform-managed secrets in later
passes. Review staged files for credentials before committing. Do not register
or deploy as part of ordinary validation.

## Free-tier invariant and transaction ownership

**FREE-TIER-001** is mandatory: one DeepSpace Free-plan deployment for this
bounded service. Follow [free-tier-budget.md](free-tier-budget.md) and
[architecture.md](architecture.md). Treat currently reported allowances as
changeable; budget uploads at 128 MiB until actual app quotas are verified.
Provider quotas for SQLite, objects, requests, CPU, and billing remain unknown.
Do not import Cloudflare Free-plan entitlements as DeepSpace entitlements.
No registration, deploy, fabricated ID, paid integration, credit-consuming
runtime test, cron, or unnecessary workload without explicit authorization.

Keep text inputs and query pages bounded. Configuration can lower the frozen
application ceilings; raising them requires budget review. Use typed
QUOTA_EXCEEDED results. Request/commit/page validation is implemented; persisted
storage counters, admission, and rate limits remain planned until operations
exist. Never claim a configured limit is durable enforcement.

One repository has one canonical persistence owner in the app-private namespace.
Only its atomic storage operation may advance HEAD. Recheck authorization,
idempotency, expected HEAD, and retained-data quotas inside one synchronous
SQLite transaction; never await inside the callback. Do not assume generic
record mutations are an atomic commit API or claim SQLite/R2 atomicity.

## Bounded scheduling and diagnostics

Follow COMMIT-001 through COMMIT-008 in [architecture](architecture.md) and the
[commit pipeline](commit-pipeline.md). Rings, request lifecycle, scheduling policy,
scheduler and their tests retain the **185-line** maximum; they are not framework
adapters. The adapter allowlist is unchanged. Domain modules may import pure
shared contracts as type-only imports; no framework dependencies are permitted.

One explicit owner retains scheduler state; no global registry or per-request
scheduler. Admission never overwrites; only diagnostics evict. Bound capacities,
metadata, outstanding promises, timers and drain scheduling. Never retain source
payloads or raw errors in telemetry. Preserve execution ownership until actual
executor settlement, even if cancellation already settled the public caller.
Do not replace a noncooperative executor on timeout or call diagnostic events a
durable audit log. Use deferred promises/fake clocks rather than timing sleeps.
No scheduler-only test proves SQLite commit atomicity or hosted lifecycle safety.
