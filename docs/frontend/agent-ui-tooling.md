# Agent UI tooling qualification

Registry and upstream documentation reviewed November 18, 2026. Use the
browser on a loopback preview with a disposable profile and test identity.
Frontend inspection tools run with local user permissions. Give them a scratch
working directory, limit their target to the preview, and avoid persistent
client configuration, shared profiles, credentials and production resources.
An origin allowlist helps prevent accidents. Process and network isolation
provide the security boundary.

## A · Microsoft Playwright MCP — adopt

- Official Microsoft implementation, Apache-2.0. Registry version **0.0.85**
  was published November 9 and uses Playwright **1.66.0-alpha-2026-11-09**.
  The pinned release was tested. A change in the underlying Playwright tool
  contract warrants re-running this matrix. [Source and license](https://github.com/microsoft/playwright-mcp)
- The server needs Node 18+ and a compatible browser. This project uses its
  existing Node/npm requirements, Python 3 for the standard-library stdio
  runner and installed Chrome. Verified on Linux with Node 24.18.0,
  npm 11.16.0, Python 3.14.4 and Chrome 155.0.8059.79. No MCP authentication
  or API credentials are required for stdio. Hosted user auth would need
  its own application identity and permissions.
- Confirmed initialize/list, navigation, accessibility snapshots, DOM
  inspection, desktop/mobile viewport resize, screenshots, keyboard focus,
  link and button interaction, verified local account access and sign-out,
  console warnings/errors and network status. The existing CDP smoke covers
  native radio interaction and exact clipboard content. The matrix uses
  resize to test responsive CSS. Physical mobile input remains untested.
- Keep stdio, isolated Chrome, allowed loopback origin and temporary output.
  The package advertises file, page evaluation and arbitrary-code tools.
  The matrix invokes a fixed set of browser tools and never uses the
  arbitrary-code tool, upload or request-body/header inspection. Do not use
  unrestricted file access, extensions, a personal profile or a shared port.
  The pinned tool lives in the npm execution cache, outside the application
  lockfile. [Configuration and security](https://github.com/microsoft/playwright-mcp#security)

### Reproduce on Windows PowerShell

Install Google Chrome, Python 3 and Node 24 with npm 11.6 or later. Windows commands below use the same runner as Linux. The
qualification was executed on Linux.

First terminal from the repository root:

```powershell
npm ci
npm run build
node scripts/preview-frontend.mjs --local-identity
```

Second terminal from the repository root. Enter the loopback URL from the first
terminal when prompted.

```powershell
$Preview = Read-Host 'Loopback preview URL'
py -3 scripts/smoke-frontend.py $Preview test-results/pass11a --local-identity
```

Stop the preview with Ctrl+C. Repeat both commands without `--local-identity`
and use `test-results/pass11a-failure` to exercise the auth failure state.
On Linux use `python3` in place of `py -3`. The runner starts the pinned
stdio server with `npx --yes @playwright/mcp@0.0.85` and closes Chrome on exit.
It persists viewport PNGs and selected inspection data. Keep real session
cookies, JWTs, request headers and profiles out of evidence.

For manual agent use, configure a temporary stdio server with command
`npx.cmd` on Windows or `npx` on Linux and these arguments:

```text
--yes @playwright/mcp@0.0.85 --browser chrome --headless --isolated
--allowed-origins <loopback-origin-without-trailing-slash>
```

Use `browser_navigate`, `browser_snapshot`, `browser_resize`,
`browser_take_screenshot`, `browser_console_messages` and
`browser_network_requests`. `browser_press_key` and `browser_click` exercise
the same navigation and controls as the matrix.

The preview reads the official Vite Worker/client output. Miniflare supplies
build-derived assets and local in-memory Durable Objects. The preview takes
only public app ID/name from the build's bindings, denies outbound Worker fetch
by default and omits local secrets. The explicit `--local-identity` option
intercepts only a reserved fixture origin. The fixture requires the app's
callback-issued cookie, creates an ephemeral ES256 key using the existing test
signer and returns a JWT through the real managed bridge. The browser session
must still reach `/api/me` successfully under the built Worker's verifier.
The fixed callback code applies solely to the isolated fixture. Provider login,
production issuers and OAuth renewal need separate qualification.

## B · Chrome DevTools MCP — optional diagnostics

- Official ChromeDevTools project, Apache-2.0. Registry version **1.13.0**
  was published November 11. Node engines are `^20.19.0 || ^22.12.0 || >=23`.
  Upstream recommends Node LTS and current stable Google Chrome. The installed
  runtime matches those prerequisites. The server was evaluated from upstream
  documentation and registry metadata. [Source and license](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- Console, request details and screenshots overlap Playwright. Trace recording,
  performance insights, loading waterfalls and layout-shift debugging justify
  it for a scoped performance investigation. Basic qualification requires
  only Playwright MCP.
- Local stdio needs no Google credential. The browser exposes cookies and
  page data to the tool, so use a fresh profile. If used for local traces, disable
  usage statistics and CrUX URL lookups and keep traces outside Git.
  Use a pinned invocation in a scratch directory.

```powershell
$env:CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS = '1'
npx.cmd --yes chrome-devtools-mcp@1.13.0 --headless --isolated --no-usage-statistics --no-performance-crux
```

## C · Figma MCP — optional design handoff

Figma maintains the official managed remote server and desktop integration.
Its public repository is a guide. The server has no public installable
open-source release, version or server license identified in the reviewed
upstream materials. Remote requires an MCP client supporting the hosted
endpoint and a Figma account authorization with file access. Desktop requires
the Figma desktop app and its local MCP option. No Figma tool or authenticated
file was available in the current agent environment. No account or connector
was configured. [Official guide](https://github.com/figma/mcp-server-guide)
· [Setup](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/)

Figma documents limited reads for Starter and View/Collab seats and higher
read limits on eligible paid Full/Dev seats. Canvas writes outside drafts
require a Full seat. Some generative operations use credits. File reads or
writes expose approved design content to the client and can create external
artifacts. Use only with an authorized design file and a design handoff that
benefits from inspecting components or variables. This React app already
defines its tokens and components in Git. Build and qualification stay local.
[Access and limits](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/)

## D · React primitives and CSS — retain existing stack

- React/React DOM **19.3.1** and React Router **7.18.5** (MIT, installed
  lockfile), native HTML, plain CSS custom properties and existing local fonts.
  Keyboard and focus behavior are testable without a new dependency or
  credentials. These integrate directly with the current Vite build.
  [React](https://github.com/facebook/react) · [React Router](https://github.com/remix-run/react-router)
- **Lucide React 1.74.0**, ISC, published November 17. Reuse the installed
  package's static named imports through the existing `SiteIcon` boundary.
  No network access, new registry or package install is needed.
  [Lucide](https://github.com/lucide-icons/lucide)
- **Radix Dialog 1.3.1**, MIT, published October 12, advertises React 19 peer
  support. It supplies accessible behavior for complex dialogs. The current
  surfaces use native controls and need no dialog. Decline the additional
  runtime and supply-chain surface now. [Radix Primitives](https://github.com/radix-ui/primitives)
