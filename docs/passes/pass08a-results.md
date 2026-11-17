# PASS 08A: agent tool and MCP qualification

## Baseline and delivery

Starting main SHA: `afc41ce2f2cf9c3cdf0156008f03ca2682f6a954`; initial worktree
was clean. The final SHA is the standalone commit containing this report,
reported at delivery and retrievable with
`git log -1 --format=%H -- docs/passes/pass08a-results.md`.

The registered app remains **undeployed**. App ID, Wrangler configuration,
Worker manifest, repository routing/authority, JWT adapter, CI engine and public
frontend are unchanged. No platform-account command, hosted application request, registration,
deployment, paid resource, cloud credit workload or background service was used.
CLI inspection was limited to local version/help. Network access was limited to
public documentation, npm installation/audit and authorized Git delivery.
Git delivery remains on the existing GitHub main branch.

## Verified capability and decision

Chose **Option A**, native SDK agent-tool API:
`registerAgentToolTransports` from installed `deepspace@0.44.2`. It supports
request-scoped tool definitions with description, schemas and execute functions,
and provides REST, authenticated Markdown discovery and a native stateless
JSON-RPC MCP subset. No custom MCP codec/server or new dependency was added.

The public guide describes CLI REST and labels MCP staging-only. We did not infer
availability from that prototype: the exact installed export/declarations/runtime
and real local workerd tests prove the subset used here. Actual Codex/Claude Code
compatibility and hosted availability remain unverified. Public selectors stay
planned, with no new commands or endpoint advertisements in the frontend.

The complete ten-item classification matrix, signatures, source paths and
TOOL-001–010 are in [agent-tool architecture](../agent-tool-architecture.md).
Key inspected APIs/locations:

| API                                                        | Installed evidence                                                      |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| registerAgentToolTransports                                | worker.d.ts:2895–2907; worker.js:11423                                  |
| registerAgentToolRoutes / AgentToolContext / route options | worker.d.ts:2810–2864, 2909; worker.js:11569                            |
| AgentToolError(code, message, status?)                     | worker.d.ts:2866–2870                                                   |
| createUserToolExecutor                                     | worker.d.ts:2887; worker.js:11295; deliberately unused                  |
| verifyAgentToken / agentTokenIssuer                        | worker.js:10901–10920; used only in credential-rejection tests          |
| deepspace agent tools / invoke                             | installed --help; cli.js:13021–13089 REST implementation                |
| createMcpTestClient / McpRpcError                          | deepspace/testing/mcp declarations and implementation; test-only import |

The lower-level dispatcher avoids the scaffold's generic RecordRoom executor and
membership store. We use the current typed Principal via authenticate/verifyJwt,
retain the verified original bearer, and let the existing canonical owner verify
it again. No owner ID, trusted synthetic subject header or alternative namespace
is accepted. No machine scope was added to the ordinary API.

## Implemented first tool

`miniagentgit.repository_head` accepts exactly `{repositoryId}`. Its result is
`{repositoryId, commitId: string | null, version: number}`. Empty repositories
return null/0; missing repositories return NOT_FOUND, never a fabricated empty
HEAD. Known wrong owners return FORBIDDEN. Only the existing owner HTTP GET/head
application operation executes; there is no SQL or commit logic in the tool.

New modules:

- `src/features/agent-tools/contracts.ts`: readonly contracts, limits and validators.
- `schemas.ts`: fixed Standard Schema/JSON Schema v1 adapters accepted by the
  installed SDK, without directly importing transitive AI/Zod packages.
- `repository-head.ts`: validated functional operation with an explicit reader.
- `src/server/deepspace/agent-tools.ts`: SDK transport/auth integration and a
  bearer-only canonical GET reader. This 138-line module retains the default
  185-line limit; no adapter exemption was added.

`src/server/app.ts` mounts those routes and types the already-existing public
app metadata bindings. The local worker fixture reads the actual assigned public
ID from Wrangler for discovery instead of inventing one. No configuration changes.

The native SDK mounts `/_deepspace/agent/tools`, `/tools.md`,
`/tools/miniagentgit.repository_head` and `/mcp`. Native MCP is a locally tested
subset, not a new complete MCP implementation or a hosted/client qualification.
It handles initialize/ping/list/call and notifications with JSON responses;
GET streaming is 405. No stdio server, OAuth discovery or client installer exists.

Limits: URL 2,048 characters/no queries; request 2,048 bytes; owner reply and tool
result 1,024 bytes. JSON-RPC envelope overhead is additional and input-bounded.
Only known output fields escape. Error bodies from the owner are discarded and
normalized to fixed messages; malformed/oversized/redirected owner replies become
UNAVAILABLE. Schema bridge errors are sanitized to prevent the SDK's validation
details reflecting rejected token values.

## Authentication and interoperability evidence

Alice reads her empty and committed repository HEAD; Bob reads his own. Bob and
Charlie cannot read Alice's HEAD. Missing/forged/expired/wrong-signature/issuer/
audience credentials and forged subject headers are rejected. Missing trusted
verification configuration returns 503. Unknown fields and namespace/owner
arguments fail closed. Prototype/inherited names and mutation tool names are 404.

The installed CLI mints an origin-bound agent-scoped credential before REST calls.
A locally signed fixture passes actual SDK verifyAgentToken for that contract,
but the unchanged MiniAgentGit user-Bearer verifier rejects it with 401.
Therefore **the real CLI-to-app invocation is not qualified or enabled**. No
cloud credential exchange was attempted, even for a loopback target. This is an
explicit blocker, not a reason to bypass verifyJwt or substitute a subject.

The installed SDK MCP test client successfully initializes, receives tools,
notifies initialization and calls the HEAD tool through a fetch bridge to actual
workerd with an authorized Bearer. It gets isError for Bob's denied invocation
and a typed RPC error for an unsupported protocol header. The bridge adapts
response types/bytes; it does not mock owner success or SQLite. This is SDK-client
wire evidence over Miniflare dispatchFetch, not actual Codex/Claude binaries,
public TCP/edge behavior or hosted OAuth/token issuance.

Native MCP execution failures have HTTP 200 plus result.isError=true. Tests and
documentation distinguish this from tool success. REST retains expected status
codes and SDK envelopes; pre-dispatch identity errors use existing HTTP behavior.

## Tests and local validation

`npm ci` passed: 462 installed, 463 audited. It reported **16 findings: 15 high,
1 low**, unlike the earlier pass's advisory result. The lockfile and dependencies
are unchanged. Additional `npm audit --json` exited 1 and confirmed the findings,
primarily glob/tooling dependency chains and esbuild. No audit fix, forced
downgrade or unrelated upgrade was performed. Applicability/remediation needs a
separate dependency review before future hosted activation; this is not a clean
audit claim.

`npm run validate` passed all existing gates:

| Command                      | Result                                          |
| ---------------------------- | ----------------------------------------------- |
| npm run type-check           | pass                                            |
| npm run lint                 | pass                                            |
| npm run format:check         | pass                                            |
| npm run check:ci-fingerprint | pass, unchanged                                 |
| npm run check:size           | 179 tracked TS/TSX files, zero violations       |
| npm test                     | **52 suites, 153 tests passed**                 |
| npm run build                | official Worker and static client builds passed |

Targeted command:
`npx vitest run tests/agent-tool-contracts.test.ts tests/agent-tools-workerd.test.ts tests/agent-tool-attacks.test.ts tests/agent-tool-failures.test.ts tests/agent-mcp-client.test.ts`
passed **5 suites / 9 tests**.

- Contract tests (3): strict arguments, immutable/serializable shapes, bounds,
  inconsistent result rejection, typed refusals and dependency exceptions.
- Workerd scenarios (5): REST discovery/invocation, native MCP, SDK MCP client,
  authenticated attacks and argument/protocol limits. These run actual local
  SQLite-backed canonical RepositoryRooms with ephemeral signed JWT fixtures.
- Fault-isolation test (1): structural namespace fixture captures canonical GET,
  verifies only Authorization is forwarded, and injects rejected/malformed/
  oversize/redirect responses. This is deliberately separate from real SQLite
  correctness evidence and is not presented as a successful mock transaction.

Before/after SQL snapshots match for repository, HEAD, commits, file contents,
manifest entries, idempotency, CI jobs and CI receipts. HEAD, completed receipt
and CI listing remain unchanged; owner recreation retains HEAD and isolation.
Outputs/discovery/error paths contain no bearer, private cookie, SQL detail,
principal claims or internal authorization capability.

## Build and resource evidence

Vite 8.3.8 production build succeeds with the unchanged registered app-ID guard.
Worker output is approximately **1,001.64 kB / 236.51 kB gzip**, versus the previous
831.41 / 200.20 kB. The native SDK schema/transport functionality adds about
170.23 kB raw / 36.31 kB gzip; these are build-reported sizes, not memory/CPU or
provider quota measurements. No new dependency was installed to obtain MCP.
Public client chunk identities and sizes remain unchanged from PASS 06H.

The operation adds one canonical owner dispatch and verified reads per call, no
new deployment slot/service/job queue/polling. Existing cold-room schema creation
and app-wide allocation/rate/CPU limits remain relevant; read-only repository
behavior is not proof of no physical storage initialization or zero provider cost.
No quota, credit or hosted operational guarantee is claimed.

## Remaining blockers and PASS 08B recommendation

1. Qualify official agent credential admission/delegation at the repository
   boundary while retaining issuer, audience, scope and persisted owner checks.
   The current CLI scoped credential is incompatible and remains rejected.
2. Exercise actual Codex/Claude Code protocol, authentication and configuration
   before any public setup instructions or compatibility claim.
3. Review existing dependency audit findings and app-wide resource limits before
   separately authorized hosted activation. The old deployment stays inactive.
4. Then expand tools through existing bounded application/authority operations,
   testing each failure and isolation boundary. A custom MCP adapter is not yet
   demonstrated necessary; do not create one speculatively.

No remaining five tools, CI scheduling change, JobRoom migration, dashboard,
public installation flow, PASS 08B work or deployment was implemented.
