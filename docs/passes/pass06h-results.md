# PASS 06H: agent-first onboarding

## Baseline and operational status

Starting main SHA: `38bb7c7b5cd854a82fb3570b383e95829c249c43`; initial worktree
was clean. The final SHA is the standalone commit containing this report, also
reported at delivery; retrieve it with
`git log -1 --format=%H -- docs/passes/pass06h-results.md`.

The owner reports the application undeployed. The former production URL is
**inactive**, not a live setup target. No hosted probe, platform CLI request,
registration, deployment or credit-consuming workload ran during this pass.
The registered ID remains unchanged. Prior PASS 06F hosted results are historical.

Mandatory architecture, engineering, API, product-site, auth and PASS
06B.1/06C/06D/06F evidence were reviewed. Actual source confirms repository/commit/
CI HTTP functionality and the managed auth bridge, but no MCP implementation or
direct Codex/Claude adapter. Reserved Wrangler paths are not implementation proof.

## Presentation changes

- Added `src/features/agent-onboarding/`: readonly contracts and metadata,
  IntegrationSelector, IntegrationPanel, HttpSetup, AgentOnboarding and scoped CSS.
- The thin homepage route composes the new feature through ProductFoundation's
  explicit children slot. Product-site does not import agent-onboarding.
- The original hero title and supporting description remain. Its primary action
  now targets `#connect`, immediately followed by integration selection and setup.
- All capabilities, commit/CI explanations, both accessible SVG diagrams,
  documentation/source links and footer remain. A compact private-ownership,
  non-executing-checks and resource-limits summary follows the diagrams.
- Documentation availability copy and README now reflect the inactive application;
  no HTTP example schemas, command generation or API behavior changed.
- Added local Chrome smoke tooling in two cohesive modules: static-server/browser
  lifecycle and interaction assertions. No browser framework/package was installed.
- Product-site, engineering and architecture documentation describe the new
  dependency direction and AGENT-UI-001–010. Import tests enforce it.

| Integration  | State                  | Instructions                                                                    |
| ------------ | ---------------------- | ------------------------------------------------------------------------------- |
| OpenAI Codex | planned                | Purpose/prerequisites; no MCP/local adapter or installer; HTTP alternative      |
| Claude Code  | planned                | Purpose/prerequisites; no verified MCP/auth setup; HTTP alternative             |
| HTTP API     | requires-configuration | Explicit deployment prerequisite, eight steps, supported credential requirement |

HTTP is selected by default. Native radios provide keyboard selection. Planned
panels contain no code blocks or disabled installation commands. Readonly step
metadata supports future copy changes; enabling actual MCP setup requires a
verified endpoint/adapter, authentication, client compatibility tests and an
explicit reviewed capability change. No availability is inferred from a label.

The HTTP walkthrough covers running service, credential, base URL, `/api/me`,
repository creation, text commit, CI admission and receipt. The homepage displays
only one combined terminal setup/identity example; details stay on `/docs`.
Both Windows PowerShell and curl.exe-in-PowerShell use the existing setupCommand,
commandExample and identity descriptor. CodePanel and its clipboard adapter are
reused unchanged. The instructions retain idempotency keys after uncertain results;
CLI developer login is not presented as a user API credential.

## Security and modularity

No server, authority, transaction, scheduler, CI, authentication, Worker,
Wrangler, package.json or lockfile changes. No new dependency or LOC exception.
The production Worker hash remains identical to PASS 06F:
`8a069bd096e3c6d9ebcb15ce9dfe3dc677ba24289920cc4101ce0f085359ee7d`.

The public import policy now scans the new feature and permits only its own
modules, React, existing narrow presentation primitives/type contracts and four
exact onboarding paths (CodePanel, commands, requests, shell contract). It rejects
route-level documentation imports, direct clipboard access, server/auth/SDK imports,
network/effects, dynamic loaders and mutable global state. Explicit browser-storage
and console capabilities are also rejected. Public bundling excludes backend/auth
code; the browser entry remains provider-free. No frontend credential acquisition,
repository mutation or provider quota/billing promise was added.

Final client assets were checked against the existing sensitive local binding
value without printing it: no match. Local generated .dev.vars/build outputs,
profiles and screenshots remain untracked/ignored. No token, key or test identity
was introduced into public assets or Git. Public code executes neither commands
nor submitted source; text is escaped and copy uses visible strings only.

## Local quality gate

`npm ci` passed: 462 packages installed, 463 audited, one existing low-severity
audit finding; no unrelated upgrade or audit fix was performed.

`npm run validate` passed all constituent commands:

| Command                        | Result                                               |
| ------------------------------ | ---------------------------------------------------- |
| `npm run type-check`           | pass                                                 |
| `npm run lint`                 | pass                                                 |
| `npm run format:check`         | pass                                                 |
| `npm run check:ci-fingerprint` | pass, unchanged                                      |
| `npm run check:size`           | 170 tracked TS/TSX files, zero violations            |
| `npm test`                     | 47 suites / 144 tests passed                         |
| `npm run build`                | official Vite Worker and static client builds passed |

Ordinary source/tests remain below 185 LOC, with no allowlist expansion. The two
new JS smoke modules are 164/155 physical lines; the size checker still scans its
established tracked TypeScript scope. Existing backend/SQLite/workerd/auth tests
remain green. Seven new unit/boundary tests cover integration data, selected
states, planned-panel honesty, command/clipboard compatibility, composition and
restricted capabilities. Prior no-control/section-count assertions were updated
to recognize native onboarding controls and new sections; secret, network,
provider, link, icon and diagram checks remain enforced.

## Chrome interaction evidence

Reproducible command after the official build:
`node scripts/smoke-agent-onboarding.mjs`.
It serves only `dist/client` on a temporary loopback port with installed Chrome
155.0.8059.79. It never starts the Worker or uses hosted auth/configuration.
Both its server and browser are stopped and its disposable profile is removed.
Screenshots are written under the system temporary directory, not committed.

All eight combinations passed: **320, 390, 768, 1440px × light/dark**.
Each combination exercises Codex → Claude Code → HTTP, both command modes and
copying, and real arrow-key wraparound/selection with a visible 3px focus ring.
Tab/Enter preserves the skip link and main target. Assertions verify:

- Accurate planned/deployment-required messages; no code blocks for planned modes.
- No page overflow or clipped controls in any mode/viewport.
- Sixteen clipboard checks copy exactly the visible code, preserving placeholders.
- No requests from integration changes, shell changes or copying.
- Both architecture SVGs remain present and labelled by existing diagram tests.
- The documentation continuation navigates to the public docs with all 24 panels.
- Zero JS exceptions, failed asset responses or protected/network API requests.

Observed traffic was 55 loopback document/asset requests across the entire matrix,
not cloud traffic. Screenshots at 390px dark and 1440px light were also visually
inspected. This establishes local production-client behavior, not hosted rollout,
actual PowerShell execution or a functioning direct agent integration.

## Bundle evidence

The registered ID permits the official build; its guard was not modified.
Current exact uncompressed production asset sizes:

| Asset                        |   Bytes |
| ---------------------------- | ------: |
| Client entry JS              | 315,119 |
| Homepage composition JS      |  16,101 |
| Shared code-panel/command JS |  11,284 |
| Shared icon JS               |   5,845 |
| Documentation JS             |   9,246 |
| Separate auth-shell JS       |  55,005 |
| CSS                          |  13,080 |

Shared chunks are fetched according to routes; summing every JS chunk is not the
homepage's initial transfer. Vite reports the unchanged Worker at 831.41 kB
(gzip 200.20 kB). No production server was deployed.

For a reproducible isolated frontend comparison,
`node scripts/measure-public-bundle.mjs` measured the unchanged baseline before
editing and the final route afterward: JS **243,305 → 258,411 bytes** (+15,106),
CSS **10,802 → 13,024 bytes** (+2,222). These are minified uncompressed standalone
esbuild fixtures, not a Vite production-bundle delta or network/heap measurement.
The official build now shares code-panel/command modules between home and docs;
that changes chunk topology and prevents naive per-chunk baseline comparisons.

## Remaining prerequisites and stop boundary

HTTP requires a running trusted application and compatible authenticated JWT;
this UI does not deploy, sign users in, export a token or connect an agent itself.
The old URL is not embedded in frontend setup instructions as a working target.
Fresh hosted OAuth/sign-out and provider limits retain their earlier qualification
limits. No new hosted verification is claimed.

Codex and Claude Code require an implemented MCP server or appropriate adapter,
verified protocol/client configuration and authentication tests before installation
instructions can be enabled. No installer, executable, npm package, MCP endpoint,
dashboard expansion, JobRoom migration or later pass was implemented.
