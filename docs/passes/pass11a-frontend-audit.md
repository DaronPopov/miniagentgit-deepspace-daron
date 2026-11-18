# PASS 11A frontend audit

## Starting state

Local `main`, tracking `origin/main`, started clean at
`72538b6f67e94aef217315d43406450607a79c3b`. GitHub advertised the same commit.
The last commit implemented PASS 10A's six native repository/CI tools. The README
records the application as inactive. Node 24.18.0, npm 11.16.0 and a fresh
`npm ci` produced the official starting build with DeepSpace 0.44.2. The
existing assigned app ID passed the build guard.

Inspected the README, engineering standards, architecture, product-site,
authentication and MCP contracts, PASS 06B–H and PASS 10A evidence, route
compositions, component styles, client request pipeline and server route table.
Verified the SDK provider, session hook, token getter and auth proxy against
installed declarations and inspected `npm run dev -- --help` and the dev command's
registration and secret-sync implementation. [DeepSpace index](https://docs.deep.space/llms.txt)
· [Project structure](https://docs.deep.space/get-started/project-structure.md)
· [Authentication reference](https://docs.deep.space/sdk-reference/client/auth.md)

## Inventory

| Surface                    | Entry and data                                                                                                                                           | Evidence and gaps                                                                                                                                                                                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing `/`                | Public. File route composes `product-site` and the `agent-onboarding` slot. Static hero, protocol selector, lifecycle diagrams, security and docs links. | Hero leads with agent version control and the primary action reaches onboarding. MCP availability is buried below the fold on mobile. The scope line emphasizes HTTP after native MCP qualification. Current landing navigation has no account destination.             |
| Docs `/docs`               | Public. `onboarding` composes semantic header, in-page navigation and two reusable sets of static copyable HTTP examples.                                | Heading and internal anchors work. Both 12-example sets occupy the same long page. MCP discovery is on the landing page and GitHub workflow. Availability copy incorrectly said syntax parsing was absent and conflated the HTTP examples with native MCP availability. |
| Sign-in entry `/dashboard` | Public account shell with route-scoped SDK provider, signed-out GitHub/Google buttons and account-only state.                                            | Local signed-out state and provider controls render. When upstream auth is unavailable, the shell shows an error and still offers provider actions. Hosted sign-in depends on an eligible managed provider and running origin.                                          |
| Signed-in `/dashboard`     | Shows verified subject and sign-out only, after SDK token exchange and identity verification.                                                            | Real local verification and sign-out succeeded. There are no repository or CI views, and the shell omits the public masthead.                                                                                                                                           |
| Error surface              | Unknown route is a Worker JSON 404. Missing bearer at `/api/me` produces a typed 401.                                                                    | Browser shows raw JSON at desktop and mobile. Keep API errors machine-readable. A user-facing 404 would require an explicit HTML routing contract in a later pass.                                                                                                      |

Vite compiles React 19 and React Router 7, with Generouted's lazy file routes
from `src/pages`. Cloudflare's Vite plugin builds the Hono Worker and static
assets. Route registration is explicit for docs and dashboard. Feature CSS
uses custom properties, system fonts, automatic light/dark preference and a
bounded Lucide `SiteIcon` vocabulary. Controls already use native anchors,
buttons, radios and fieldsets. Existing reusable components include
`SiteContainer`, `HeaderShell`, `SiteSection`, `SiteFooter`, `LifecycleDiagram`
and `CodePanel`. Landing action links, auth buttons and copy buttons duplicated
border, height and focus treatment. Card borders and surfaces were repeated.
Reuse those primitives and preserve the feature boundaries.

## Browser observations

The [baseline](../frontend/evidence/pass11a/README.md) covers 1440×1000 and
390×844 CSS pixels. Public pages each rendered one H1 and one main landmark.
The inspected page roots fit both widths, inspected input labels were present,
fragment IDs resolved, and Tab/Enter moved through the visible skip link to
main. The landing-to-docs navigation worked. Direct loads of all three valid client routes emitted a React Router warning about a missing lazy-route fallback. The small mobile header wrapped
above the hero. Readable text and lightweight diagrams are worth preserving.
The account screen has limited context and no next step beyond links to home
and documentation. Auth failure, 401 and 404 produced the expected failed
HTTP responses. The signed-in baseline shows the existing account shell.

The browser preview uses the official built client and Worker with local
workerd. The installed dev CLI can synchronize platform secrets and may
register an app on first use. The preview exercised local application behavior
without either operation. See the [tooling procedure](../frontend/agent-ui-tooling.md).

## Trust boundaries

- Public initialization remains static and carries no SDK session logic.
  Copy operations explicitly use the existing clipboard adapter.
- The browser reads same-origin API data only after obtaining the SDK token
  and checking that `/api/me` matches its session subject. Aborts, expiration,
  sign-out and identity changes invalidate reads. Server-side JWT checks and
  persisted owner checks determine access.
- There is no account repository index or commit-history collection route.
  Known IDs let the existing API retrieve metadata, HEAD, immutable commit
  details, tree pages and CI jobs. Any owner-index proposal requires separate
  storage and budget work.
- HEAD advances inside the canonical RepositoryRoom transaction. CI admission
  is durable, ordered by job identity and generation, and targets a commit.
  Native MCP forwards original credentials and reuses the owner operations.

Implement shared control/surface CSS, semantic status colors, a lazy-route
loading status, an ordinary Account link and accurate docs copy now. Use the [PASS 11B contract](../frontend/pass11b-implementation-plan.md)
for landing hierarchy, dashboard data and documentation navigation.
