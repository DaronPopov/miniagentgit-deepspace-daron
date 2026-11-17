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
