# Pass 01 results

Status: foundation implemented; production build blocked by account registration.
The user explicitly chose to leave registration blocked and document the
limitation. This is not a fully validated runtime or deployment.

## Revision evidence

- Starting SHA: `75cf2d932c19969a66d338e81aac2c24ebbb4416` (`main`).
- Final implementation SHA: `dc296aee335bfbb3f605c730ad614b2fcc43c836`.
- This results document is committed separately after the implementation. The
  final delivery commit is the report commit: obtain its exact SHA with
  `git log -1 --format=%H -- docs/passes/pass01-results.md`. The delivery message
  also records that SHA; a document cannot embed its own Git commit hash.

The supplied workspace was empty, so the named GitHub repository was cloned
into it. It contained only README.md and had no unrelated changes. GitHub
reported push/admin permissions and an unprotected main branch. Commit identity
was configured locally from the initial commit's existing name/noreply email.

## Official scaffold and tools

Inspected current official [installation documentation](https://docs.deep.space/get-started/installation),
[project structure](https://docs.deep.space/get-started/project-structure),
[architecture](https://docs.deep.space/concepts/architecture), documentation
index, and [agent skill](https://github.com/deepdotspace/deepspace-skill/blob/main/skills/deepspace/SKILL.md).
Executed `npm create deepspace@0.44.2 .`, after npm metadata confirmed that was
the latest release. The scaffold installed the exact matching SDK.
Installed declarations and `npx deepspace dev start --help` confirmed the
runtime/build requirements. `npx deepspace --version` returned `0.44.2`.

Actual environment: Node `24.18.0`, npm `11.16.0`. Supported Node range:
`>=22.15.0 <23 || >=24 <25 || >=26 <27`; npm minimum `11.6.0`.

Resolved direct versions (also recorded reproducibly in package-lock.json):

| Package                         | Version      |
| ------------------------------- | ------------ |
| deepspace (SDK and CLI)         | 0.44.2       |
| hono                            | 4.13.19      |
| react / react-dom               | 19.3.1       |
| react-router                    | 7.18.5       |
| @generouted/react-router        | 1.20.3       |
| @cloudflare/vite-plugin         | 1.69.1       |
| @cloudflare/workers-types       | 5.20261117.1 |
| @types/node                     | 24.19.2      |
| @types/react / @types/react-dom | 19.3.0       |
| @vitejs/plugin-react            | 6.3.0        |
| eslint                          | 9.39.5       |
| eslint-plugin-react-hooks       | 7.1.1        |
| typescript-eslint               | 8.73.0       |
| prettier                        | 3.8.3        |
| typescript                      | 5.9.3        |
| vite                            | 8.3.8        |
| vitest                          | 4.1.12       |
| wrangler                        | 4.164.0      |

## Structure and dependency choices

One npm package. Retained official file routes, Vite/React and Cloudflare
plugins, SDK build plugin, worker entry, six DO bindings/migration declarations,
and required users schema. Framework subclasses are justified SDK wiring.
Removed starter auth flows, AI/MCP tools, collaborative examples, billing,
prerendering, themes, UI kit, and their unused direct dependencies.
No additional ORM, auth library, HTTP framework, or storage driver was added.
Hono is the scaffold's HTTP framework. Vitest and ESLint are scaffold tools;
Prettier and Node types complete formatting and tooling type checks.

Shared contracts live in src/contracts; application operations in
src/application; transport in src/server/api; framework assembly in src/server
and worker.ts; SDK schemas in src/schemas; UI in src/pages; tests in tests.
Engineering standards reserve src/domain and src/server/storage for actual
future implementations instead of adding empty directories. There is no
repository state, HEAD mutation, history, authentication flow, or MCP endpoint.
The health check asserts liveness only.

## Clean-install validation

Executed `npm ci --no-fund --no-audit` successfully: 461 packages installed.
Then executed `npm run validate`, which ran these exact commands in order:

| Command                                                     | Result                                          |
| ----------------------------------------------------------- | ----------------------------------------------- |
| `npm run type-check` (`tsc --noEmit`)                       | PASS                                            |
| `npm run lint` (`eslint . --max-warnings 0`)                | PASS                                            |
| `npm run format:check` (`prettier --check .`)               | PASS                                            |
| `npm run check:size` (`node scripts/check-source-size.mjs`) | PASS: 15 tracked files; zero violations         |
| `npm test` (`vitest run`)                                   | PASS: 3 files, 6 tests                          |
| `npm run build` (`vite build`)                              | BLOCKED: exit 1; SDK requires registered app ID |

Consequently **npm run validate exits 1**, not green. CI deliberately runs the
same complete validation and will fail on this build gate until registration.
The build fails before bundling, so downstream bundling errors remain unknown.

Tests cover health JSON/content type, rejected writes and repository routes,
line counting including blanks/comments and CRLF, path precedence/exclusions,
and an isolated real Git CLI fixture proving tracked-only scanning and exit 1
for 186-line ordinary/test files and 301-line integration files.

`git diff --cached --check` passed. Tracked paths and staged content were
reviewed; a bounded credential-pattern scan of 36 implementation files found
zero private-key, GitHub token, AWS access-key, or JWT patterns. No credentials
were added. This is a targeted review, not an exhaustive secret-scanner audit.

## Blocker, exceptions, and outstanding risks

`npx deepspace auth whoami --json` returned `not_authenticated` on production.
The installed SDK build plugin refuses `DEEPSPACE_APP_ID = "__APP_ID__"` and
requires `npx deepspace app init`. No ID was fabricated and no build guard was
bypassed. The user chose to defer registration. A future owner must authenticate,
confirm their identity, explicitly register, commit the minted ID, and repeat
clean-install validation. Registration is separate from deployment.

No size exceptions. No dev server, browser verification, Cloudflare runtime,
platform tests, or deployment was performed. HTTP tests run Hono in-process;
they do not prove the Worker, assets, DO bindings, or platform connectivity.
Retained Durable Objects have no mounted room routes; tasks/jobs reject work.

npm reports a deprecation warning for scaffold-selected ESLint 9.39.5. It is
retained to avoid an unverified major-version migration. Dependency security
was not audited (`--no-audit`); no vulnerability-free claim is made. Ownership,
module cohesion, and dependency direction require review alongside automated
checks. Generated routes are explicitly excluded; new source must be staged
before tracked-file size validation. Direct SDK is pinned; the committed lock
pins the full dependency graph. Future SDK updates require official guidance.
