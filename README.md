# MiniAgentGit

A small cloud-native, headless version control service for AI coding agents.
Pass 05 includes repository creation, immutable UTF-8 snapshots, atomic SQLite
HEAD updates, durable idempotency, owner-only HTTP, and asynchronous fixed CI. Local
workerd tests exercise the real server and SQLite-backed Durable Objects with
controlled signing keys. Hosted authentication/deployment remains unverified.

See [API](docs/api.md), [architecture](docs/architecture.md),
[free-tier budget](docs/free-tier-budget.md), and
[Pass 05 results](docs/passes/pass05-results.md).

## Develop

Use Node 24 (verified: 24.18.0) and npm 11.6+ (verified: 11.16.0).
The supported Node range is recorded in package.json.

```sh
npm ci
npm run validate # types, lint, formatting, fingerprint, size, tests and build
npm run dev -- --host 127.0.0.1
```

The official dev command requires a DeepSpace session and registered app.
`wrangler.toml` intentionally retains `__APP_ID__`: no account was registered
for this pass. When an owner explicitly chooses to register, first run
`npx deepspace auth whoami`, then `npx deepspace app init --json`, and commit
the server-minted app id. Consult the official installation guide first.
Do not deploy or run `deepspace push` as an installation step.

The static shell lives at `/`; `GET /api/health` reports stateless liveness.
Protected repository APIs require a Bearer JWT verified against trusted public
key, issuer and audience; `GET /api/me` reports its verified subject. CLI login
does not authenticate HTTP users. No browser login flow, MCP, R2, branches,
merges or Git wire compatibility is implemented. Fixed non-executing CI is implemented.

## Commands

```sh
npm run type-check
npm run lint
npm run format:check
npm run format
npm run check:size
npm test
npm run build
```

`npm run validate` runs all checks plus the build. Stage new source files before
the size check: it scans tracked files, including staged additions. Vitest
runs pure scheduler tests, real Node SQLite tests, and local workerd HTTP/Durable
Object tests. It does not register an app or contact DeepSpace. Production
bundles are generated under `dist/` and ignored by Git.

See [engineering standards](docs/engineering-standards.md), [agent rules](AGENTS.md),
and [Pass 01 results](docs/passes/pass01-results.md) for boundaries and evidence.
The scaffold's Vite/React file routes, Hono worker, the original six SDK bindings plus the repository owner,
SDK build plugin, and required users schema are retained. Unused feature
examples and UI dependencies were removed. There is one npm package and a
committed package-lock.json; no separate ORM, auth library, or storage driver.

Official references: [installation](https://docs.deep.space/get-started/installation),
[project structure](https://docs.deep.space/get-started/project-structure),
[architecture](https://docs.deep.space/concepts/architecture), and
[agent skill](https://github.com/deepdotspace/deepspace-skill).

PASS 05 adds durable asynchronous fixed CI for immutable commits. See
[CI pipeline](docs/ci-pipeline.md) and [API routes](docs/api.md). It checks manifest
integrity and bounded source policy; it does not execute repository code or run
TypeScript/ESLint/tests on submitted files. After changing validator code/policy,
run `npm run ci:fingerprint` and commit the reviewed fingerprint. Standard
validation and production configuration reject a stale fingerprint.

PASS 06B adds a public landing page with accurate local capability descriptions,
accessible inline SVG commit/CI lifecycles and source-linked documentation. It
needs no auth provider or backend data. See [PASS 06B results](docs/passes/pass06b-results.md)
for local browser evidence and the unchanged production build limitation.

The public `/docs` route provides an HTTP quick start with separately labelled
Windows PowerShell and curl.exe examples. It requires no sign-in to read and
never supplies a real API credential. Use the operator-provided service origin
and compatible Bearer JWT; CLI developer login is not that credential. See
[product-site architecture](docs/product-site.md) and
[PASS 06C results](docs/passes/pass06c-results.md) for validation and limitations.

### Authentication shell

`/dashboard` contains the route-scoped DeepSpace authentication boundary only;
it does not load repositories or CI data. `/` and `/docs` remain public.
The registered application is live at
https://miniagentgit-deepspace-daron.app.space. PASS 06F wires the managed auth
bridge and verifies existing-session Bearer identity, repository and CI APIs.
Fresh interactive provider login/sign-out qualification is tracked separately
in the PASS 06F report. See
[authentication architecture](docs/authentication-architecture.md) and
[PASS 06D evidence](docs/passes/pass06d-results.md). Do not register another app or deploy as part of ordinary local validation.
