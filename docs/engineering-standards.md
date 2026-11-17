# Engineering standards

MiniAgentGit is a headless, cloud-native service for coding agents. The React
page is a statically bundled public presentation feature. Keep one npm package and the official
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
`src/server/api/{health,principal,request,repositories,repository-owner}.ts`, and
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

Domain contracts and pure logic live in `src/domain/` and must not depend on
React, HTTP or Cloudflare SDKs. Persistence adapters live in `src/server/storage/`
with explicit application-owned contracts. Do not create empty trees or placeholder
services.

Only the repository persistence authority may advance HEAD. Transport code
must not directly mutate repository state. HTTP and future MCP adapters must
share application-level operations. No circular dependencies or cross-layer
shortcuts. The health operation imports only its shared contract. The client
imports no server code. Framework schema declarations are not domain types.

The six original SDK Durable Objects remain inert framework wiring. The custom
RepositoryRoom owns the real SQL authority and one bounded scheduler per canonical
live owner. Only its commit transaction advances HEAD. Identity verification and
the local repository API are implemented; hosted browser login and MCP remain
deferred. No generic SDK record mutation path can write repository state.

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
QUOTA_EXCEEDED results. Request/commit/page validation, repository-local durable logical-byte/file/commit
limits, and scheduler/payload admission are implemented. App-wide repository
cardinality, ingress/rate, physical database, CPU and credit controls remain
unimplemented or unverified. Never claim a configured limit is durable enforcement.

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
Scheduler-only tests still do not prove SQL atomicity. Pass 04 adds real Node
SQLite transaction tests and actual local workerd Durable Object HTTP tests;
these do not establish hosted lifecycle safety. The two new allowlisted files
are genuine public/owner HTTP adapters, not storage/business modules. All new
storage, preparation, runtime and test files retain the 185-line default.

## Canonical persistence and local evidence

Hash only validated, well-formed UTF-8 text and versioned deterministic formats.
Prepared payloads are copied, privately retained under the scheduler's capacity,
and released only on known queued cancellation or real executor settlement.
No SQL transaction spans async preparation. Immutable rows reject updates/deletes;
idempotency replay precedes expected-HEAD rejection. Count retained logical data,
including old contents/manifests/receipts, rather than just current file bytes.
Keep logical accounting separate from physical SQLite/provider storage quotas.

Test SQLite failures with actual BEGIN/COMMIT/ROLLBACK and the same authority
code. Test workerd lifecycle/routing with local SQLite-backed namespaces and
short-lived generated signing keys. The local server-worker test bundle must
never replace the official production build or alter its app-ID guard. No
hosted authentication/deployment claim may follow from a local signing fixture.

## Fixed durable CI

Follow CI-001–CI-010 in [CI pipeline](ci-pipeline.md). Treat repository code as
untrusted data; never execute it or load its configuration/plugins. Validation
identity includes implementation and policy fingerprints. After changing the
validator dependency graph, regenerate `npm run ci:fingerprint`, review and commit
the fingerprint; validation and Vite reject stale generated identity.

Admission/results belong in repository-owned SQL, with generation fencing and
bounded snapshots, diagnostic/output budgets, attempts and retained identities.
No silent deletion of idempotency records. waitUntil is not durable acceptance.
CI storage, validation, engine and tests retain 185 LOC; only the real CI HTTP
adapter is added to the explicit 300-line allowlist. No new LOC exceptions.

## Public frontend modules

Follow UI-001–UI-008 in [architecture](architecture.md). Thin public routes compose
`src/features/product-site/`; presentation components import only React and their
own feature, with static named Lucide imports isolated to the approved SiteIcon
boundary. Backend/domain contracts, SDK hooks, credential adapters and future
authenticated features must not leak into the public dependency graph. Place
future onboarding, auth-ui and dashboard responsibilities in separate bounded
features, not the public layout. No hidden fetch, socket, effects, module store,
SSR or Dynamic Worker. Keep display contracts readonly and transport-neutral.

Use ordinary CSS custom properties, native semantic links/landmarks, visible
keyboard focus, a skip target, responsive gutters and system color preference.
No runtime theme dependency, external font request or component library. All
frontend source/components/content/hooks/tests retain 185 LOC; no new adapter
classification or size exception. Public boundary tests use tracked files, so
stage new modules before validation.

PASS 06B.1 permits `lucide-react` only in
`src/features/product-site/components/site-icon.tsx`. Use the finite semantic
vocabulary, static named imports, readonly metadata and decorative aria-hidden
SVGs alongside retained text labels. No namespace imports, dynamic loaders,
whole-library registries, icon-only actions or architecture-diagram replacement.
The public import policy and focused tests enforce this narrow dependency path.

Onboarding lives in `src/features/onboarding/`, not the product feature. Follow
DOCS-001–DOCS-010 in [product-site.md](product-site.md). Reuse only the explicitly
allowlisted public primitives/type contracts; preserve the reverse dependency
boundary. Only its clipboard adapter may access navigator, and only for an
explicit copy action. Copy the displayed string verbatim; never fetch/replace
credentials or execute commands. Match actual routes/validators and label shell
syntax accurately. All onboarding components, formatters and tests keep 185 LOC.

## Agent onboarding presentation

Follow AGENT-UI-001–010 in [product-site.md](product-site.md). The homepage route
composes agent-onboarding through the product layout's explicit children slot;
product-site and onboarding cannot import agent-onboarding or each other's route
compositions. Agent-onboarding may use React, its own modules, SiteIcon and the
existing narrow shared presentation primitives, type-only icon contracts, plus
exactly onboarding CodePanel, examples/commands, examples/requests and the shell
contract. Existing public import tests enforce these exact dependencies. Clipboard
capability stays in the original adapter; no auth/network/effect/storage capability
is granted to the new feature. All new modules/tests retain 185 LOC without an
adapter exemption. Native controls own keyboard behavior; no new UI framework,
registry or installer is introduced. Availability changes require verified
implementation evidence rather than a selectable integration label.

## Qualified agent tool boundary

Follow TOOL-001–010 in [agent-tool architecture](agent-tool-architecture.md).
Agent-tool contracts, schema adapters and read-only operation live separately from
React in `features/agent-tools`; only the server assembly mounts their SDK transport.
Preserve the original bearer across canonical owner reads; do not replace it with
trusted identity headers or the generic RecordRoom executor. Tool failure messages
and output shapes are allowlisted and bounded. All new files retain 185 LOC,
including the 138-line framework adapter: no new 300-line allowance is needed.
Public integrations stay planned until actual client and credential qualification.

## Scoped tool credential boundary (PASS 08B)

The tool-only SDK policy and binding-only HEAD adapter live in
`src/server/deepspace/{agent-auth,agent-owner}.ts`; both retain the default 185-line
cap, without an adapter exception. Ordinary API/owner authentication remains
unchanged. Forward only the original bearer to the canonical owner, verify it
again on the dedicated agent path, and use existing readHead/persisted ownership.
Never use synthetic identity headers or a generic SDK record executor. Agent
scope is not owner permission. Follow MCP-AUTH-001–010 in agent-tool architecture.
Onboarding can describe this local qualification while keeping inactive client
connections unavailable and installation commands disabled.
