# PASS 06C results

Status: complete public `/docs` onboarding with two separately labelled HTTP
command modes. No authentication UI, browser token acquisition, repository
dashboard or PASS 06D feature is implemented. Work stops after PASS 06C.

## Revision and inspection

Starting SHA: `0fd2c036571ec83e2103f7dc45965025c48e9ca5`, main, verified clean
worktree/index before editing. Preserved the product-focused landing page,
Lucide layer, tokens, primitives and file-based routing. This pass is one commit;
its final SHA is reported on delivery and available using
`git log -1 --format=%H -- docs/passes/pass06c-results.md`. A file cannot contain
its own Git commit hash.

Read AGENTS.md, engineering standards, architecture, API, CI pipeline, free-tier
budget and PASS 06B/06B.1 results. Inspected React root, Generouted/Vite wiring,
actual Hono routes, JWT adapter, input validators, source-size and public import
checks. Existing implementation was authoritative. Baseline: 34 suites / 106
tests passing. No SDK functions, token values, audience or hosted origin guessed.

## Delivered frontend and route boundaries

- `src/pages/docs.tsx`: five-line composition of DocumentationPage.
- `src/features/onboarding/contracts/documentation.ts`: readonly request,
  command, shell, placeholder and guide contracts.
- `examples/requests.ts`: eleven static, real HTTP operation descriptions and
  canonical sample bodies. No frontend API client or duplicate validator.
- `examples/commands.ts`: deterministic PowerShell literal/command formatting,
  two readonly command collections and setup strings.
- `content/guide.ts`: API concepts, retry safety, CI outcomes, authentication
  prerequisites, availability/limits and navigation.
- `components/`: page/command-mode composition, semantic code panels and a narrow
  clipboard adapter. Copy is the only explicit browser capability.
- `styles/documentation.css`: existing tokens, wrapping controls, scrollable
  code panels, keyboard access and responsive page containment.
- Homepage Docs navigation and HTTP API documentation link now point to `/docs`.
  Other product copy, layout, actions and Lucide vocabulary are preserved.

An exact public GET /docs handler was added to `src/server/app.ts` to fetch the
existing static asset root. Wrangler uses not_found_handling=none, so a new
client route needs that shell mapping for direct navigation/refresh. No catch-all
HTML response, new API capability, SSR or authenticated request is introduced.
The Hono test verifies `/docs` maps to assets `/`, while `/api/docs` remains 404.
Actual production assets/routing remain gated by the official build prerequisite.

The onboarding import policy allows only its own modules, React, type-only
presentation contracts and exact public header/container/footer/icon primitives.
Product code cannot import onboarding. Only the clipboard adapter may access
navigator; it writes the literal displayed command on click. No SDK/provider,
credential adapter, global store, fetch or socket is added. DOCS-001–DOCS-010 are
recorded in [product-site.md](../product-site.md).

## Examples and shell contracts

Each mode has eleven operations: health, identity, create repository, initial
commit, HEAD, commit metadata, tree, file, CI request, status and receipt.
Every command carries stable operation ID, label, method/route, shell, visible
command, explanation and required placeholder metadata. UI IDs are namespaced
by shell. There are 22 operation panels plus two setup panels.

Windows PowerShell 5.1+ examples use Invoke-RestMethod, environment variables,
headers, ConvertTo-Json -Depth 8 and explicit UTF-8 bytes for JSON bodies.
The curl.exe mode explicitly requires PowerShell 7.3+ on Windows and curl.exe
7.76+, with `$PSNativeCommandArgumentPassing = 'Standard'` to preserve JSON quotes.
It uses ConvertTo-Json/ConvertFrom-Json and checks the native exit status.
It is neither a Bash script nor a cmd.exe script and avoids the `curl` alias.

Setup contains only `<BASE_URL>` / `<BEARER_JWT>` placeholders. Separate GUID keys
are generated once for creation and commit, not on retry. Repository/commit/job
IDs are captured from actual success response values. No real hostname, token,
test signing key, invented CLI installation or fictional API response is shipped.
Health is documented as plain JSON; protected successes use `{ok,value}`. CI 202
means accepted, not passed; pending receipts return 409. Uncertain commit results
require the same semantic request/key and never imply rollback.

The guide states that developer CLI login is not automatically a user API token.
Hosted authentication, audience and deployment remain unverified. Authentication
UI/exchange belongs to later work; no registration/deployment is performed here.
The landing page is not given project-delivery or release-number copy.

Shell syntax was reviewed against Microsoft's
[JSON serialization](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/convertto-json)
and [native argument parsing](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_parsing)
documentation and the [curl manual](https://curl.se/docs/manpage.html).
PowerShell/Windows curl.exe are not installed in this Linux environment. They
were **not executed as Windows shell scripts**; tests check command structure,
escaping, labels and payload parity. This is distinct from the real HTTP
integration evidence below.

## Exact validation results

| Command                        | Result                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `npm ci`                       | Passed; 462 packages installed. Existing one low-severity audit item reported.   |
| `npm run type-check`           | Passed strict TypeScript.                                                        |
| `npm run lint`                 | Passed, zero warnings.                                                           |
| `npm run format:check`         | Passed.                                                                          |
| `npm run check:ci-fingerprint` | Passed; CI source identity unchanged.                                            |
| `npm run check:size`           | Passed, 139 tracked TS/TSX files, zero violations. No new allowance/exception.   |
| `npm test`                     | Passed, 37 suites / 114 tests; eight added tests, all prior tests retained.      |
| `npm run build` (via validate) | Blocked only by unchanged SDK app-ID guard: DEEPSPACE_APP_ID remains **APP_ID**. |
| `npm run validate`             | All pre-build gates pass; nonzero at that external registration prerequisite.    |
| `git diff --cached --check`    | Passed; reviewed changes, secrets, generated files and dependency boundaries.    |

`onboarding-examples.test.ts` checks all routes/methods, existing mutation
validators after placeholder substitution, JSON/newline formatting, labelled
PowerShell/curl syntax and forbidden imports. `onboarding-render.test.ts` checks
fresh public rendering with fetch denied, no credential leakage, code escaping,
24 accessible controls/status regions, exact copy-adapter input, denial handling,
static-shell routing and mobile overflow rules. Existing public import/cycle and
browser-target compilation checks now include the docs feature/route.

`onboarding-workerd.test.ts` executes all eleven operation descriptors through the
actual local worker and SQLite-backed RepositoryRoom with an ephemeral signed
JWT. It creates a repository, commits the exact sample text with final LF,
retrieves HEAD/metadata/tree/file, accepts CI with 202, reads status and obtains
a passing receipt. This validates the shared request payloads/HTTP contracts,
not Windows shell execution. Pending receipt observations are bounded to twenty;
no cloud requests or hosted credentials are used. All previous real SQLite,
workerd, CI, JWT and scheduling tests remain green.

## Chrome rendering and copy evidence

Used installed Chrome 155.0.8059.79 and a disposable loopback React/client fixture
with the actual `/docs` component and CSS. Temporary command:
`node /tmp/miniagentgit-docs-smoke.mjs`; it used existing Node/esbuild and DevTools
Protocol, with no new browser framework. Runtime/profile/server were disposed.
Temporary screenshots/JSON are in /tmp, not repository artifacts.

| Viewport / theme | Document scroll width | Panels with internal horizontal scrolling | Clipped buttons |
| ---------------- | --------------------: | ----------------------------------------: | --------------: |
| 320 × 800 light  |                 320px |                                        24 |               0 |
| 390 × 844 dark   |                 390px |                                        24 |               0 |
| 768 × 1000 light |                 753px |                                        22 |               0 |
| 1440 × 1000 dark |                1425px |                                        21 |               0 |

All cases rendered 24 panels/buttons, with no horizontal **page** overflow or
runtime exception. Long commands intentionally scroll inside keyboard-focusable
pre regions. Inspected narrow/light and desktop/dark command-panel screenshots.
Tab exposed the skip link with 3px outline at top=8px; Enter focused main-content.
A real pointer click on the setup copy button wrote exactly the displayed command
to Chrome's clipboard, retaining `<BEARER_JWT>` unchanged, and announced “Command
copied.” in every viewport. The generic copy adapter also has deterministic
success/denial tests. Four cases requested only twelve local HTML/CSS/JS assets;
no API/auth/font/socket request occurred, including after copying.

Temporary minified client-fixture measurement: 248,677 JS bytes + 10,457 CSS bytes,
uncompressed, including React/react-dom and docs. This is not a production Vite,
full router, upload quota or deployment measurement. Production compilation still
stops before bundling at the preserved app-ID guard; later build errors are unknown.

## Dependencies, limitations and stop boundary

Zero new dependencies. package.json, lockfile, DeepSpace 0.44.2, React 19.3.1,
lucide-react 1.74.0, existing root/router/Vite configuration and app ID are
unchanged. Server API authorization, persistence, atomic HEAD, CI execution,
resource ceilings and JWT verification are untouched. The exact public asset
mapping is the only server change. No broad LOC exemption or new framework.

Local client fixtures do not qualify hosted auth, real audience, production
asset routing, all assistive technologies or Windows shell execution. The guide
marks those boundaries; no paid service, registration, deployment, fake app ID,
cloud credits, background workload, executable CI, MCP, auth UI or dashboard was
added. PASS 06D and PASS 06E were not started. The completed report now supplies
the prerequisite evidence for a separately authorized authentication pass.
