# PASS 12A hosted security gate

**Blocked before deployment.** The production app has no active route or
serving release. The documented deployment workflow publishes the canonical
origin. The inspected production account metadata, CLI flags and official
documentation did not establish a trusted-account ingress restriction or an
enforced spending ceiling for the assigned app. App-level JWT and owner
checks constrain repository access. They do not cap app-wide ingress or
aggregate repository allocation across valid account identities.
[Deployment](https://docs.deep.space/concepts/deployment)
· [CLI commands](https://docs.deep.space/cli-reference/commands)

## Build and configuration review

- Source pins the user audience to the production API worker. Its verifier
  requires the configured trusted key and issuer, validates expiration and
  rejects anonymous subjects. Managed callbacks constrain the return origin.
  Auth writes require the same origin, and the app uses Secure, HttpOnly,
  SameSite=Lax session cookies.
- Native MCP uses a separate agent verifier with derived agent issuer, exact
  target-origin audience, exact scope, strict expiration and signed account
  subject. The original bearer crosses the private binding, is verified
  again and must satisfy persisted ownership. User-only APIs remain scoped
  to user JWTs.
- The managed proxy and SDK transport use bounded bodies. Requests and
  output contracts use bounded data and sanitized error paths. The checked-in
  asset headers and same-origin browser read policy remain in place. Actual
  hosted headers and CORS behavior are unverified.
- The Worker binds canonical SQLite RepositoryRoom and JobRoom together
  with the existing SDK Durable Objects. There are no auto-provisioned
  paid bindings in this candidate. Repository and CI limits are enforced
  per owner room. Physical SQLite, CPU and app-wide resource enforcement
  remain unverified.
- The production secret names check reported no user-managed secrets in
  `prd`. PASS 06F observed platform-provided auth configuration historically.
  This observation does not establish current production bindings or auth
  behavior for an undeployed release.

See [authentication](../authentication-architecture.md),
[agent authority](../agent-tool-architecture.md), and
[parser resource qualification](../ci-parser-resource-qualification.md).

## Gate decision

The current Babel parser call is synchronous. Input/work limits and timers
cannot provide a hard CPU or memory bound within that call. The combination
of that gap, public ingress and no demonstrated cost ceiling prevents
controlled exposure. There is also no confirmed non-destructive shutdown
path for hosted Durable Object data. Keep the existing app undeployed.

Missing bearer, signature, issuer, audience, scope, expiration and
foreign-owner denials are covered by local tests. Hosted negative probes,
fresh OAuth, token renewal and sign-out remain unverified. No credentials
were minted or exchanged during the pass. No dependency change was made.
