# PASS 08B: scoped MCP credentials and agent onboarding

## Baseline and stop boundary

Repository: `DaronPopov/miniagentgit-deepspace-daron`; branch `main`.
Starting HEAD: `d023920c9b1a4805a514a020754697abd42c5722`; worktree clean.
Final SHA is the commit containing this report, retrievable with
`git log -1 --format=%H -- docs/passes/pass08b-results.md` and reported at delivery.

The existing registered application remains **undeployed**. App ID, Wrangler
configuration, manifests, dependency versions and engine requirements are
unchanged. No registration/deploy, platform authentication request, hosted app
probe, paid resource, model invocation, cloud credit workload or production secret
change ran. The local preview requested before this pass had already been stopped.

## Credential and authority verdict

**Scoped admission: locally qualified. Repository authorization: locally
qualified with independent owner-side verification.** The SDK supports a verified
account subject, so this pass can admit matching owner credentials without
inventing a delegation relationship or substituting identity headers.

The [trust model](../agent-tool-architecture.md#pass-08b-scoped-credential-trust-model-supersedes-the-08a-blocker)
records installed declarations, runtime implementation, exchange endpoints and
MCP-AUTH-001–010. The decision was written before adapter implementation:

1. Trust the configured public key and base issuer, not decoded/caller identity.
2. Admit established user JWTs on tools as before; separately verify agent JWTs
   with SDK verifyAgentToken, issuer base/agent, exact Request.url origin audience,
   exact agent scope, mandatory finite/unexpired exp and nonanonymous subject.
3. Bind only the signed sub/VerifiedAuth.userId to the persisted repository owner
   by exact equality. Scope, roles, owner overrides and nested delegation claims
   grant no additional permission. A separate agent account cannot impersonate
   an existing human owner.
4. Forward the original bearer through the existing app-private DO binding to
   the exact GET-only agent HEAD path. Reverify there, preserve canonical object
   identity checks and use the existing service.readHead/storage owner check.
5. Keep ordinary user API and ordinary owner-route authentication unchanged.
   Agent credentials are rejected there, including ordinary HEAD and CI reads.

`agent-auth.ts` and `agent-owner.ts` each remain under the ordinary 185-line cap.
RepositoryRoom retains one authority/runtime; no duplicate repository engine,
namespace, SQL schema, CI/scheduler change, generic internal API, signing service,
credential persistence or synthetic user JWT was introduced. Agent owner paths
are not public app routes. No caller chooses an owner namespace.

## Supported wire surface

The unchanged native SDK transport exposes only:

| Path                                                       | Capability                                                     |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| GET /\_deepspace/agent/tools                               | Authenticated static tool discovery                            |
| GET /\_deepspace/agent/tools.md                            | Authenticated SDK Markdown discovery                           |
| POST /\_deepspace/agent/tools/miniagentgit.repository_head | Existing bounded HEAD result                                   |
| POST /\_deepspace/agent/mcp                                | Native stateless initialize/ping/list/call/notification subset |

All other MCP methods retain 405/Allow POST. No new public MCP route, SSE/stdio
bridge, OAuth discovery, additional repository/CI tool or dashboard exists.
The HEAD tool's input/output schemas and 2,048-byte request / 1,024-byte result
caps remain unchanged, as do URL/query bounds and sanitized errors. MCP owner
failures remain result.isError=true; REST retains FORBIDDEN/NOT_FOUND and status
consistency. Pre-dispatch identity failure remains 401 or configuration 503.

The binding-only path is
`GET /_deepspace/agent/repositories/:id/head`; unsupported methods are 404 and
query strings are rejected. It reuses SDK verification and application ownership,
not the SDK generic RecordRoom trusted-header executor. Original Authorization
is the only forwarded header. Wrong canonical room, forged headers and foreign
audiences cannot bypass the authority.

## Evidence classification

| Claim                                          | Classification                                     | Evidence / limits                                                                                     |
| ---------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Verified agent subject/issuer/origin/scope     | SDK declaration and implementation verified        | Installed 0.44.2 worker.d.ts/worker.js; actual SDK verifier tests                                     |
| Agent REST and MCP HEAD calls                  | Locally verified                                   | Real workerd/SQLite, signed local fixtures, native SDK MCP test client                                |
| Alice succeeds; Bob/Charlie denied             | Locally verified                                   | REST 403 and MCP isError; direct owner tests; persisted ownership                                     |
| Empty/committed/missing HEAD; no writes        | Locally verified                                   | SQL snapshots of all application tables before/after; owner restart                                   |
| Ordinary user API policy preserved             | Locally verified                                   | Existing full suite plus scoped rejection of principal/repository/HEAD/CI paths                       |
| DeepSpace CLI token exchange/refresh/invoke    | Client verified locally with simulated issuer      | Installed CLI process, local signing fixture and loopback bridge to actual Worker; no hosted issuance |
| Codex and Claude configuration syntax          | Local CLI-help and official-documentation verified | Codex 0.169.0; Claude Code 2.1.322; no client connection claim                                        |
| Codex/Claude MCP sessions                      | Not yet verified                                   | No model/client session or supported deployed target exercised                                        |
| Hosted issuance, renewal, routing and audience | Not yet verified                                   | Application remains undeployed; no auth-service request                                               |

The SDK CLI session path exchanges its session cookie through
`POST /api/auth/agent-token` with JSON `{target: origin}`. The automated local test
runs actual `deepspace agent tools` and `agent invoke`, simulates the signing
endpoint, forces one initial 401 and verifies the CLI remints/retries once.
It uses a unique exclusive local-test session file, private permissions, and
exact-path cleanup. Existing CLI sessions are neither read nor overwritten;
all child service URLs point to loopback. Three local exchanges occur across
discovery/retry and invocation. The portable-account branch is staging-restricted
and was source-inspected, not invoked against a real account.

The installed SDK contains no authoritative auth-service signing implementation
or guaranteed agent JWT TTL. We require signed expiration but do not invent its
duration or a hosted refresh promise. Unexpired Bearer replay can repeat this
read-only operation; immediate revocation/one-time tokens are not implemented.
Malformed/expired replays are rejected. No bearer appears in responses or assets.

## Onboarding changes and actual commands

Codex and Claude Code retain their selector positions but now render structured,
feature-local connection details: transport, authentication, inactive non-secret
endpoint pattern, local qualification, one supported tool, prerequisites,
verification steps, limitations and official client documentation links.
Status is **Unavailable** while undeployed; transport qualification is separately
labelled local. The metadata contract distinguishes available, locally-qualified,
planned and unavailable states without treating a label as activation.

**No actual installation/configuration command is enabled.** Hosted credential
acquisition/renewal, an activated trusted target and real client sessions remain
unqualified. There is no live old URL, secret placeholder substitution, command
execution, automatic authentication or protected request in the public panels.

Research confirmed these syntax capabilities, not app connectivity:

| Client              | Confirmed format                                                                                                          | Source                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Codex 0.169.0       | mcp add with --url and --bearer-token-env-var; TOML mcp_servers entry with url and bearer_token_env_var                   | Installed help and [official MCP guide](https://developers.openai.com/codex/mcp) |
| Claude Code 2.1.322 | mcp add --transport http with --header; mcpServers JSON with type=http, url and headers; environment references supported | Installed help and [official MCP guide](https://code.claude.com/docs/en/mcp)     |

No user Codex/Claude configuration was changed. The app does not currently expose
MCP OAuth discovery, so client OAuth login commands are not an established
credential path. API/DeepSpace CLI developer login is not presented as an agent
JWT to paste. Exact syntax alone does not justify a working installer.

The HTTP default selection, eight workflow steps, two shell modes, existing
CodePanel/clipboard adapter and /docs continuation remain intact. No new UI
framework/dependency, server import, provider, network/effect or hidden state was
added. Inline endpoint/tool names wrap on narrow screens.

## Tests and validation

`npm ci` passed under Node **24.18.0**, npm **11.16.0**: 462 installed / 463 audited.
It still reports **16 package findings (15 high, 1 low), two distinct advisories**.
The [PASS 08A.1 audit](../security/dependency-audit.md) remains applicable:
picomatch build/development ReDoS has no published patch; esbuild's Windows
servedir fix is outside the SDK range. No dependency or lockfile changes occurred.
No clean dependency-security or hosted production qualification is claimed.

`npm run validate` passes all gates:

| Gate                         | Result                                                        |
| ---------------------------- | ------------------------------------------------------------- |
| npm run type-check           | pass                                                          |
| npm run lint                 | pass                                                          |
| npm run format:check         | pass                                                          |
| npm run check:ci-fingerprint | pass; unchanged identity                                      |
| npm run check:size           | 188 tracked TS/TSX files; zero violations                     |
| npm test                     | **56 suites / 160 tests passed**, zero failed/skipped         |
| npm run build                | official Vite/Cloudflare Worker and static client builds pass |

Targeted command includes agent-tool-contracts, agent-tools-workerd,
agent-tool-attacks, agent-tool-failures, agent-mcp-client, agent-scoped-auth,
agent-scoped-owner, agent-scoped-mcp and agent-cli tests: **9 suites / 16 tests**.
This uses actual SDK verification and real local SQLite-backed Durable Objects,
not mocked successful persistence. Structural failure fixtures remain separate.

Coverage includes valid scoped/user tokens, missing/malformed credentials,
invalid signature, wrong issuer/origin/scope, missing/expired exp and future nbf,
anonymous/blank subjects, missing verifier settings, forged owner/identity
claims, Alice/Bob/Charlie isolation, ordinary API rejection, direct binding
reverification, canonical-room mismatch, method/query limits, empty/committed/
missing HEAD, bearer replay, owner restart, unchanged full SQL snapshots, MCP
isError and bounded/sanitized output. Existing commits, atomic HEAD, JWT, CI
integrity/generation fencing and frontend boundary tests remain green.

## Chrome and bundle evidence

`node scripts/smoke-agent-onboarding.mjs` passes all **eight** combinations:
320, 390, 768 and 1440px × light/dark, using installed headless Chrome locally.
It serves only dist/client over a temporary loopback server. Checks cover every
integration, arrow-key switching, skip link/focus, no page overflow or clipped
controls, exact copying in both HTTP shell modes, no installation blocks for
inactive agents and correct local-qualification/tool/endpoint/isError copy.

Sixteen clipboard checks match visible HTTP instructions exactly. /docs retains
24 example panels. Zero JavaScript exceptions, asset failures or protected API
requests were observed; all 55 document/asset requests were loopback. Selecting,
changing shell and copying generate no network requests. Screenshots for every
integration/viewport/theme remain in /tmp; Codex 390px dark and Claude 1440px light
were visually inspected. Smoke tooling closes its server/browser and removes its
disposable profile. No ongoing preview server remains.

Public client JS was scanned against existing local credential binding values
without printing them: zero matches. JWT/private-key patterns also have zero
matches. Local .dev.vars, generated routes, screenshots and build output remain
ignored/uncommitted. No credential material is in the Git diff.

Production bundle measurements compare the actual official build with PASS 08A.1:

| Output                        | Before bytes | After bytes |  Delta |
| ----------------------------- | -----------: | ----------: | -----: |
| Worker JavaScript             |    1,001,641 |   1,004,960 | +3,319 |
| Six client JS chunks combined |      412,600 |     415,531 | +2,931 |
| Client CSS                    |       13,080 |      13,377 |   +297 |
| Client HTML                   |          397 |         397 |      0 |

Vite Worker gzip: 236.51 kB → 237.12 kB. These are local build sizes, not CPU,
memory, network or provider quota measurements. Dependency versions and CI
validator fingerprint remain unchanged. No build guard or app ID was bypassed.

## Remaining prerequisites

Before any separately authorized activation: verify the actual issuer's agent
token exchange/TTL, canonical hosted origin routing and account-subject semantics;
qualify private acquisition/renewal in real Codex and Claude Code sessions; test
fresh hosted isolation and errors; review residual dependency and aggregate
resource-limit risks. Independent-agent-to-human delegation is not implemented.
No client setup availability may be inferred from local SDK fixtures.

No additional repository/CI tools, JobRoom migration, dashboard features,
production secret changes or deployment are included. Stop after PASS 08B.
