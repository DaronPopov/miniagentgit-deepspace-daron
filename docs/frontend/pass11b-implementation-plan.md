# PASS 11B implementation contract

## Scope and architecture

Keep the three existing file routes and the route-scoped DeepSpace provider.
Compose the public site in `product-site` and `agent-onboarding`, the guide in
`onboarding`, and account-only data in a bounded dashboard feature behind the
existing auth boundary. Use shared CSS primitives and native controls. No new
runtime UI dependency is required. Start with owner resources by known ID.
Treat an account-wide repository index as a separate API and persistence decision.

## Landing page

1. **Hero.** Lead with a lightweight, durable repository and CI service for AI
   coding agents. Keep an in-app agent setup action and make the docs and account
   links easy to find. Label local MCP qualification and actual service availability.
2. **Workflow.** Show three steps with their data outputs. Discover authorized
   tools, submit changes with expected HEAD and a stable idempotency key, then
   request CI for the resulting immutable commit and read the receipt.
3. **Repository and CI.** Explain an empty HEAD, immutable parent-linked
   snapshots, conflict/retry behavior and durable admission versus terminal
   result. Reuse the accessible lifecycle diagrams and keep supporting text
   readable at mobile sizes. Describe the fixed source checks and deferred
   TypeScript semantics.
4. **Security and onboarding.** Explain credential audience/issuer and
   repository ownership without revealing headers or configuration. Link to
   MCP and HTTP quick starts, troubleshooting and architecture. Keep client
   badges descriptive until each connection is qualified.

## Dashboard

Build account status first. After verified sign-in, expose a known-ID repository
lookup and show the result. A blank initial screen should say how to find a
repository ID. Add controls only once their underlying browser API path is
qualified.

| View or action              | Implemented HTTP contract                                                                                            | PASS 11B requirement                                                                                                                                                                                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account identity            | `GET /api/me`, verified user subject                                                                                 | Reuse route-scoped session client and explicit loading/checking, signed-out, expired, unavailable and error states.                                                                                                                                                                      |
| Repository listing          | No account-scoped collection read or durable owner index                                                             | Leave the account-wide list out. Never show a fabricated empty list. A future listing needs an explicit owner-index design, bounded pagination, quotas and reconciliation evidence.                                                                                                      |
| Create repository           | `POST /api/repositories` with name and stable idempotency key                                                        | Browser pipeline currently supports protected GET and excludes the collection path. A write needs an explicit same-origin POST operation, bounded inputs and stable key through retries. Use the returned ID for navigation or defer the control.                                        |
| Repository details and HEAD | `GET /api/repositories/:id`, `GET /api/repositories/:id/head`                                                        | Show stored name/ID and HEAD/version. Display an explicit empty HEAD at version zero. Abort stale reads on route/identity change.                                                                                                                                                        |
| Commit history and detail   | `GET /api/repositories/:id/commits/:commit`, plus commit-addressed tree and file reads. Metadata includes parent ID. | Show known commit metadata and an optional bounded parent link traversal. A first-class paged history endpoint is absent. Keep current commit selected while viewing tree pages and display file text safely.                                                                            |
| CI request                  | `POST /api/repositories/:id/ci/commits/:commit`                                                                      | Only enable on a verified immutable commit and after an explicit same-origin write path is qualified. Render persisted job ID/status on 202.                                                                                                                                             |
| CI status and receipts      | `GET /api/repositories/:id/ci/jobs`, `GET .../jobs/:job`, `GET .../jobs/:job/receipt`                                | Consume bounded server pages and fixed states. Offer explicit refresh or bounded cancellable polling. Show pending 409, terminal outcome, receipt schema, commit/pipeline identity and safe diagnostics when available. Distinguish schema 1 and 2 according to the installed contracts. |

Use local discriminated outcomes for pending, ready, empty, forbidden, missing,
expired, retryable failure and request cancelled. Keep protected data out of
the render tree until the matching session is verified. On mismatch, account
switch or sign-out, clear view data and cancel outstanding requests. Correlate
request identity and resource ID before committing any result. Interpret
401 as session loss, 403 as forbidden, 404 as missing and 409 by operation.
Never treat aborted or timed-out mutations as rollback. Show a safe retry or
recovery instruction using the API's existing rules.

Use page-local selection unless the routing and Worker asset policy explicitly
support persistent deep links. Add no unauthenticated HTML fallback for reserved
API paths. See [verified HTTP contracts](../api.md) and
[authentication architecture](../authentication-architecture.md).

## Documentation

Make `/docs` an accessible entry with MCP, HTTP and troubleshooting sections.
Keep PowerShell and curl.exe syntax labeled and sample origins/token values
as placeholders. Offer the existing formatter and verbatim copy controls.

- Explain `POST /_deepspace/agent/mcp`, initialization, `tools/list` and
  `tools/call`. Include native REST discovery and explain `isError` before
  reading `structuredContent`. Describe the stateless JSON-RPC subset.
- Specify trusted origin, private Bearer JWT, user versus origin-bound agent
  credential, issuer/audience checks and persisted ownership. CLI login is
  distinct from API authorization. Give client instructions only for an
  actually qualified client/issuer combination.
- Follow the six-tool sequence from repository creation through HEAD, commit,
  CI admission, status and terminal receipt. Start with a deliberately failing
  valid snapshot and follow with a correction. Keep immutable IDs and explain
  stable key recovery on ambiguous outcomes, stale HEAD reconciliation,
  pending receipts, quota and unsupported-client errors.
- Update the current examples' availability text only from verified runtime
  evidence. Use the [locally qualified workflow](../mcp-repository-workflow.md)
  as the source of tool names, limits and result fields.

## Implementation and acceptance order

1. Land public hierarchy and guide navigation. Verify no initialization
   protected requests and no new public server/SDK dependency. Check all
   anchors and command buttons in both themes.
2. Build the signed-in read path for known IDs, using only existing owner
   endpoints. Exercise valid empty and populated HEAD, malformed IDs, foreign
   ownership, missing data, route switch, expiration and sign-out. Verify
   loaded data clears when identity changes.
3. Add CI list, status and durable receipts for a known commit. Test an empty
   page, pagination, pending receipt, terminal failure and passing correction.
   The original receipt must stay retrievable. Bound refresh and polling.
4. Add creation or CI request only if the route-scoped mutation path and
   replay behavior are qualified with genuine signed fixture requests.
   Include negative cross-origin, stale session, owner mismatch and
   uncertain-outcome tests. Leave listing and paginated history deferred
   unless their APIs are separately approved and implemented.
5. Run `npm run validate`, the existing CDP smoke and the Playwright MCP
   fixture matrix against PASS 11A's measured baseline. Review desktop and
   mobile, light and dark, keyboard order/focus, form labels, error handling,
   console and request failures, and measure the same production assets.
   Include authenticated failure and sign-out. Platform OAuth and real
   coding-client connections require their own credentials and evidence
   before any launch claim.
