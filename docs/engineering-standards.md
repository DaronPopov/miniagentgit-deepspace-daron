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

| Paths                                              | Maximum |
| -------------------------------------------------- | ------- |
| `tests/**`, `**/*.test.ts(x)`, `**/*.spec.ts(x)`   | 185     |
| `worker.ts`, `vite.config.ts`, `vitest.config.ts`  | 300     |
| `src/server/**` (HTTP and DeepSpace adapters only) | 300     |
| Other tracked `.ts` and `.tsx` files               | 185     |

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

The six Durable Object subclasses are framework-required integration wiring,
not domain inheritance. No room endpoints are mounted; tasks and jobs reject
execution. No repository persistence authority exists yet, and no code advances
HEAD. Auth, repository commits/history, and MCP are outside this pass.

## Validation and changes

`npm run validate` runs strict type checking, ESLint, Prettier check, tracked
source size checks, Vitest, and the Vite production build. CI repeats it after
`npm ci`. Unit/adapter tests do not prove Cloudflare or platform behavior.
Test meaningful positive and negative boundaries when changing behavior.

Keep generated files, node_modules, build output, credentials, and local
DeepSpace/Wrangler state out of Git. Use platform-managed secrets in later
passes. Review staged files for credentials before committing. Do not register
or deploy as part of ordinary validation.
