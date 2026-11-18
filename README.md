# MiniAgentGit

MiniAgentGit is a small Git-inspired repository and CI service for coding
agents. It stores private, immutable text snapshots, advances HEAD atomically,
and runs fixed checks against a submitted commit. The HTTP API and six native
MCP tools share the same repository, ownership, and CI authority.

## Try the hosted app

1. Open [MiniAgentGit](https://miniagentgit-deepspace-daron.app.space) and sign in
   with an approved DeepSpace account. The homepage opens after identity is
   verified.
2. Under **Connect your coding agent**, select **OpenAI Codex** or **Claude Code**.
   Choose Bash or PowerShell, follow the terminal instructions, and copy the
   authenticated command. The app checks MCP discovery before copying it.
3. Paste the command in your project terminal. In the client session it opens,
   use `/mcp` to check for MiniAgentGit. Copy a new command when the token expires.
   Keep the copied command private because it contains a short-lived credential.
4. Create a repository through MCP or HTTP and save its ID. Open
   [Dashboard](https://miniagentgit-deepspace-daron.app.space/dashboard) to inspect
   its HEAD, parent commits, committed files, CI jobs, and receipts.

The public [documentation](https://miniagentgit-deepspace-daron.app.space/docs)
provides manual MCP setup and HTTP examples. Those examples use placeholders.
The dashboard opens repositories by known ID and has no account-wide repository
list. Repository creation, commits, and CI requests use MCP or HTTP.

Hosted MCP initialization and six-tool discovery were verified with Codex and a
fresh DeepSpace credential. The complete failing-to-passing workflow was
verified with Codex against a local Worker. A complete hosted write and CI run
and a real Claude Code connection remain unverified.
[Local Codex evidence](docs/passes/pass12e-results.md)

## Run locally

Use Node 24 and npm 11.6 or later. See `package.json` for supported Node ranges.

```sh
npm ci
npm run validate
node scripts/preview-frontend.mjs --local-identity
```

Open the printed loopback URL. To sign in with the isolated fixture, open
`/api/auth/oauth-complete?code=pass11a-local-browser` on that loopback origin.
The preview uses ephemeral credentials and local Durable Objects. It does not
contact production. The authenticated command-copy controls require HTTPS.
Stop the preview with Ctrl+C.

For the dashboard browser matrix, install Google Chrome and Python 3, then run
`python3 scripts/smoke-dashboard.py test-results/dashboard` after the production
build. The runner starts its own isolated preview.
[Browser tooling](docs/frontend/agent-ui-tooling.md)

`npm run dev -- --host 127.0.0.1` is the DeepSpace development workflow for an
authenticated developer with access to the registered application. Ordinary
local validation requires no deployment or new app registration.

## Development and reference

- `npm run validate` runs TypeScript, lint, formatting, the CI fingerprint,
  tracked source-size checks, tests and the production build. Stage new source
  files before the size check. Build output under `dist/` is ignored by Git.
- CI checks manifest integrity, source policy, syntax, lint rules and local
  imports as data. It does not execute submitted source or run semantic
  TypeScript analysis. If changing validator policy, review the update produced
  by `npm run ci:fingerprint`. [CI pipeline](docs/ci-pipeline.md)
- The checked-in app ID identifies the existing DeepSpace app. Production
  access is restricted to verified server-side approved subjects.
  [Admission setup](docs/security/global-admission.md)
- [HTTP API](docs/api.md) · [MCP contracts and workflow](docs/mcp-repository-workflow.md)
  · [Architecture](docs/architecture.md) · [Authentication](docs/authentication-architecture.md)
  · [Engineering standards](docs/engineering-standards.md)
