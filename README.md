# MiniAgentGit

Foundation for a cloud-native, headless version control service for AI coding
agents. Pass 01 supplies a minimal DeepSpace app and engineering checks.
Repository commits, history, authentication flows, and MCP are not implemented.

## Develop

Use Node 24 (verified: 24.18.0) and npm 11.6+ (verified: 11.16.0).
The supported Node range is recorded in package.json.

```sh
npm ci
npm run validate # build currently blocked until owner registration
npm run dev -- --host 127.0.0.1
```

The official dev command requires a DeepSpace session and registered app.
`wrangler.toml` intentionally retains `__APP_ID__`: no account was registered
for this pass. When an owner explicitly chooses to register, first run
`npx deepspace auth whoami`, then `npx deepspace app init --json`, and commit
the server-minted app id. Consult the official installation guide first.
Do not deploy or run `deepspace push` as an installation step.

The shell lives at `/`; `GET /api/health` returns
`{"status":"ok","service":"miniagentgit"}`. This is stateless liveness,
not a check of storage, platform connectivity, or deployment readiness.
Other API methods/paths return 404. No repository writes are exposed.

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
runs offline unit/HTTP adapter tests; it does not register an app. Production
bundles are generated under `dist/` and ignored by Git.

See [engineering standards](docs/engineering-standards.md), [agent rules](AGENTS.md),
and [Pass 01 results](docs/passes/pass01-results.md) for boundaries and evidence.
The scaffold's Vite/React file routes, Hono worker, six Durable Object bindings,
SDK build plugin, and required users schema are retained. Unused feature
examples and UI dependencies were removed. There is one npm package and a
committed package-lock.json; no separate ORM, auth library, or storage driver.

Official references: [installation](https://docs.deep.space/get-started/installation),
[project structure](https://docs.deep.space/get-started/project-structure),
[architecture](https://docs.deep.space/concepts/architecture), and
[agent skill](https://github.com/deepdotspace/deepspace-skill).
