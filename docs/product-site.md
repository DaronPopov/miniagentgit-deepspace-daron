# Public frontend and documentation

The existing Vite/Generouted browser root discovers `src/pages/index.tsx` and
`src/pages/docs.tsx` as `/` and `/docs`. Both routes only compose features.
There is no SSR, Dynamic Worker or public authentication provider. The server's
exact GET /docs handler maps to the existing static asset root because Wrangler
uses not_found_handling=none; refreshes must not depend on a catch-all SPA fallback.
Unknown API paths keep typed errors, not HTML.

`src/features/product-site/` owns the public product presentation and reusable
container, header, footer, tokens and finite Lucide vocabulary. Its content stays
product-focused, without project-delivery or release-number copy. `/docs` is owned
by `src/features/onboarding/`: readonly request/command contracts, static HTTP
examples, guide content, deterministic command formatting and copyable panels.
No repository mutation originates in React. Copy never executes a command.

The onboarding dependency allowlist permits its own files, React, type-only
public presentation contracts and exactly header-shell, site-container,
site-footer and site-icon primitives. The product feature cannot import onboarding;
it links to `/docs`. Neither may import server/application/domain, credentials,
auth-ui or dashboard implementations. Lucide stays isolated in SiteIcon.
The only additional browser capability is write-only clipboard access in the
onboarding clipboard adapter, invoked from an explicit button click. No effect,
fetch, WebSocket, hidden substitution or persistent browser token storage.

## Documentation invariants

- **DOCS-001:** every advertised operation is an implemented route, exercised
  through the actual local workerd application in integration tests.
- **DOCS-002:** static JSON examples satisfy existing mutation validators after
  replacing idempotency placeholders; production routes validate them again.
- **DOCS-003:** no invented CLI package, installer, token endpoint, hostname,
  credential or hosted login flow. Hosted identity/audience remains unverified.
- **DOCS-004:** PowerShell and curl.exe examples declare their Windows shell and
  compatibility requirements. PowerShell JSON serialization is shared; curl.exe
  native quoting uses explicit Standard argument passing, never Bash syntax.
- **DOCS-005:** copy writes exactly the string displayed in the code node. The
  page never reads credentials or replaces placeholders for the user.
- **DOCS-006:** public imports exclude all backend-only implementation layers.
- **DOCS-007:** fresh documentation initialization makes no protected request.
- **DOCS-008:** HTTP 202 persists a job, not a passing receipt; status/receipt
  retrieval is a separate manual step with bounded observations in local tests.
- **DOCS-009:** uncertain commits require the same semantic input/key for replay;
  cancellation/lost responses are not evidence of rollback.
- **DOCS-010:** commands and text render as escaped React children, never innerHTML
  or executable repository code. No live repository diagnostics are loaded.

There are eleven operations per command mode and a setup panel per mode (24 code
panels). Setup supplies placeholder origin/token and generates two separate GUID
keys. Successful creation/commit/CI responses populate subsequent identifier
variables. No fictional successful responses are displayed. Retain keys after an
uncertain result; generate fresh ones only for a deliberately new workflow.

The code panel uses native buttons, labelled figures, a keyboard-focusable pre
with horizontal scrolling, and polite status feedback. Clipboard denial displays
a generic manual-copy instruction. Colors, wrapping navigation, focus and light/
dark behavior reuse the existing CSS system; no highlighter/dependency is added.

Node tests prove rendering, exact copy-adapter behavior, dependency direction,
valid payloads and real API responses. Chrome fixtures prove local geometry,
clipboard events and unchanged placeholder strings. They do not establish Windows
shell execution, production Vite routing or hosted auth. Authentication UI and
credential acquisition remain separate work; this pass does not implement them.

## PASS 06D authentication boundary

The separate `auth-ui` feature composes `/dashboard` with SDK-managed session
state and a protected route shell only. Public homepage and documentation keep
their existing flow and provider-free initialization. No repository dashboard or
mutation is added. The shell fails closed when registration is absent; hosted
authentication also requires the managed proxy and trusted token configuration.
See [authentication architecture](authentication-architecture.md) for session
fencing, credential handling, tests and qualification limits. The preceding
PASS 06C description records that pass's historical scope.

## PASS 06H: agent-first onboarding

The owner reports the application undeployed. Treat the old production URL as
inactive; this pass makes no hosted request to requalify it. The registered ID
is retained unchanged. Earlier deployment statements describe historical evidence.

`src/pages/index.tsx` now composes `AgentOnboarding` as children of
`ProductFoundation`. The product feature exposes a ReactNode composition slot
below its unchanged hero title; it does not import the new feature. The hero's
primary action points to `#connect`. All previous sections, diagrams and source/
documentation links remain. An explicit security/resource summary follows the
architecture diagrams without promising platform quota or billing guarantees.

`src/features/agent-onboarding/` owns readonly integration/status/step contracts,
metadata, a native radio selector, selected instructions and a compact HTTP
setup panel. HTTP defaults selected and is **requires-configuration** (deployment
required); Codex and Claude Code are **planned**. Tabs do not imply availability.
Their prerequisites and limitations are text only, with an HTTP alternative link.
No MCP installation string or fictional CLI package is displayed.

Both public features consume existing presentation primitives. The new feature
can import exactly onboarding's CodePanel, command generator, request descriptors
and shell contract. Product and documentation features cannot import the new
feature; neither route imports the other's composition. CodePanel owns clipboard
behavior through the existing write-only adapter. The home panel renders one
combined setup/identity example, generated from the same descriptors as `/docs`;
complete mutation/receipt commands remain on `/docs`.

Native radio groups provide Tab/arrow-key interaction without effects, refs,
DOM access or custom keyboard focus state. Selection and copy feedback are local
React state. Status text is live-announced; commands are escaped and scroll inside
the panel. Changing integration or shell resets obsolete copy feedback. CSS uses
existing tokens, 40rem layout breakpoint, system theme and visible focus.

### AGENT-UI invariants

- **AGENT-UI-001:** readonly metadata and serializable contracts are separate from
  rendering; no backend models are duplicated.
- **AGENT-UI-002:** HTTP examples reuse descriptors validated against the actual
  local API; prerequisites remain visible before placeholder commands.
- **AGENT-UI-003:** only the HTTP choice displays commands. Planned panels display
  prerequisites and instructions without an installation block.
- **AGENT-UI-004:** tracked-source import tests and browser bundling exclude server,
  auth, signing, SDK and backend dependencies from public features.
- **AGENT-UI-005:** static capability checks and real browser request observations
  show no automatic network calls on selection or copying.
- **AGENT-UI-006:** CodePanel copies the exact visible generated command. No hidden
  substitution, token acquisition or execution occurs.
- **AGENT-UI-007:** the route only composes features; auth, owner and HEAD code are
  unchanged and absent from the public dependency graph.
- **AGENT-UI-008:** HTTP explicitly requires deployment; no previous app URL is
  embedded in the frontend as an active endpoint.
- **AGENT-UI-009:** future MCP instructions require a real protocol/auth adapter,
  compatibility tests for each client, and an explicit reviewed capability change.
  Step/purpose/prerequisite copy stays data-driven; no eager integration registry
  or activation flag circumvents those requirements.
- **AGENT-UI-010:** `/docs`, HTTP request schemas and backend behavior remain intact;
  only documentation availability copy reflects the undeployed state.

See [PASS 06H results](passes/pass06h-results.md) for unit/API compatibility,
Chrome matrix and production bundle evidence. No deployment was performed.

## PASS 08B: honest MCP connection panels

Codex and Claude Code selections now show Unavailable while the app is inactive,
with native HTTP MCP and credential admission separately described as locally
qualified. Each panel names the single HEAD tool, authentication/owner rules,
non-secret inactive endpoint pattern, activation/client/credential prerequisites,
verification steps, limits and official client configuration documentation.
No installation or config command is enabled: actual coding-client sessions,
hosted issuance/renewal and an active trusted service remain unqualified.

AGENT-UI-003 still permits copyable commands only for HTTP. MCP panels may render
static inline endpoint/tool names, with wrapping at narrow viewports. They do not
fetch credentials, mount SDK providers or call protected APIs. Capability labels
separate available, locally-qualified, planned and unavailable states; metadata
does not activate a transport. HTTP default selection, two shell generators,
clipboard adapter, /docs continuation and public feature boundaries are retained.
