# MiniAgentGit MCP repository workflow

## Connect Codex or Claude Code

Open the [hosted app](https://miniagentgit-deepspace-daron.app.space/#connect)
and sign in with an approved account. Choose your client and terminal shell.
Use the displayed terminal instructions, copy a fresh authenticated command,
and paste it from your project directory. The copy action verifies the
account and calls MCP discovery with the new token before writing to the
clipboard. The command contains a short-lived credential and applies only to
the client process it starts. Use `/mcp` inside that session to inspect
the available tools. Copy a new command after expiry.

Codex discovered all six tools through hosted native MCP. The full
failing-to-passing lifecycle ran locally with Codex. Hosted writes, CI and
Claude Code interoperability remain unverified.

## Credential and transport

The signed-in UI uses a supported DeepSpace user JWT. Native tools also accept
an unexpired DeepSpace agent JWT issued for the exact app origin. Agent tokens
require the configured ES256 key, issuer with the SDK's `/agent` suffix, exact
origin audience, `agent` scope, and signed nonanonymous subject. Either identity
must pass the configured admission policy and own the repository it accesses.
An ordinary user JWT uses the configured user audience instead of the agent
audience. Do not send agent-scoped credentials to user-only API routes.

For manual client setup, see the [public MCP guide](https://miniagentgit-deepspace-daron.app.space/docs#mcp-guide).
The DeepSpace CLI's `agent tools` command handles its own credential exchange
and lists REST tool metadata. That command does not attach tools to a different
Codex or Claude session. Send credentials only as bearer authorization to
the intended trusted service. [DeepSpace account credentials](https://docs.deep.space/agents/account-api.md)

The native endpoint is `POST /_deepspace/agent/mcp`. Initialize and discover
the tools with `tools/list`, then use `tools/call`. The SDK's stateless HTTP
subset returns JSON-RPC and provides no MCP session stream or OAuth discovery.
Native REST discovery is `GET /_deepspace/agent/tools` and `GET /_deepspace/agent/tools.md`.
Invoke the same tool via REST at `POST /_deepspace/agent/tools/<name>` with
`{"input":{...}}`. REST success uses `{ok:true,result}`. MCP success returns
the same value in `structuredContent`. Inspect `isError` before using a result.
See [DeepSpace account credential documentation](https://docs.deep.space/agents/account-api.md).

## Tool contracts

Object fields are required unless marked optional. Extra fields are rejected.
`repositoryId` is `repo_` plus 16–32 lowercase letters/digits, and newly derived
IDs contain 32 lowercase hex digits. Commit IDs are 64 lowercase hex digits.
Job IDs are `ci_` plus 64 lowercase hex digits. Creation and commit keys contain
16–64 ASCII letters, digits, underscores or hyphens.

| Tool                             | Input                                                        | Successful result                                   |
| -------------------------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| `miniagentgit.repository_create` | `{name,idempotencyKey}`                                      | `{id,name,createdAt}`                               |
| `miniagentgit.repository_head`   | `{repositoryId}`                                             | `{repositoryId,commitId,version}`                   |
| `miniagentgit.repository_commit` | `{repositoryId,expectedHead,idempotencyKey,message,changes}` | `{id,parentId,message,createdAt}`                   |
| `miniagentgit.ci_request`        | `{repositoryId,commitId,pipelineId?}`                        | Persisted CI job, with state at admission or replay |
| `miniagentgit.ci_status`         | `{repositoryId,jobId}`                                       | Persisted CI job                                    |
| `miniagentgit.ci_receipt`        | `{repositoryId,jobId}`                                       | Immutable terminal CI receipt                       |

Names contain 1–64 ASCII letters, digits, spaces, underscores or hyphens and
start with a letter or digit. Repository creation derives the ID from the
verified subject and creation key. Creation and commit results expose stored
metadata fields and omit account identifiers. `createdAt` is an ISO timestamp.

An empty HEAD has `commitId: null` and `version: 0`. A root commit has
`parentId: null`. Submit `expectedHead: null` to commit against an empty
repository. For a subsequent commit, pass the exact current HEAD ID. Changes
contain 1–16 distinct relative paths and use `{kind:"put",path,text}` or
`{kind:"delete",path}`. Paths are 1–240 printable ASCII characters without
traversal, backslashes, colons, percent signs, queries or fragments. The message
must be nonblank. Its cap is 1 KiB UTF-8. Each submitted file is at most 32 KiB
and the combined text at most 128 KiB UTF-8. See [HTTP commit semantics](api.md#commit-request-and-snapshot-behavior)
for additional snapshot and retained-storage limits.

The only accepted explicit pipeline ID is `miniagentgit-ci-v1`. The job result
has `id`, `repositoryId`, `commitId`, `pipeline`, `state`, `generation`,
`attempts`, `createdAt`, `updatedAt`, `deadline` and `code`. The pipeline has
`id`, `version` and `fingerprint`. Job and receipt times are epoch milliseconds.
Job state is `queued`, `running`, `passed`, `failed`, `cancelled`, `expired` or
`interrupted`. CI request success indicates durable admission. Re-requesting the
same commit and pipeline identity reuses the same job and preserves the existing
bounded redispatch policy.

The receipt has `schemaVersion`, `jobId`, `repositoryId`, `commitId`, `pipeline`,
`generation`, `completedAt`, `terminalState`, `state`, `code`, `checks`,
`diagnostics`, `truncated`, `files`, `bytes` and `work`. Use `terminalState`
to distinguish the five terminal outcomes. `state` is the validation verdict
(`passed` or `failed`). Schema 2 reports `manifest`, `source`, `syntax`, `lint`,
`imports`, and `typescript` under `checks`. Schema 1 historical receipts omit
`syntax`, `lint` and `imports`. An unrun check is `skipped` and semantic
TypeScript is `deferred`. Diagnostics contain fixed `check` and `code` fields
with optional bounded `path` and `line`. Pending receipt reads return
`CONFLICT` with a fixed pending message.

## Failing-then-passing workflow

1. Create a repository with a fresh key and read its empty HEAD.
2. Commit `src/main.ts` using `expectedHead: null` and a new commit key. Include
   `import { value } from "./dep";` and `export const result = value;` on
   separate newline-terminated lines. Save the returned commit ID.
3. Request CI for that immutable commit. Observe the persisted status with a
   bounded client wait, then read the terminal receipt. Expect `missing_import`
   at `src/main.ts`.
4. Read HEAD and commit `src/dep.ts` with `export const value = 42;` followed by
   a newline. Use the observed HEAD and a fresh commit key.
5. Request CI for the new commit and read the terminal receipt when ready.
   Expect all five active stages to pass and TypeScript semantics to remain
   deferred. The original commit and failing receipt remain available.

If a creation or commit response is lost or cancelled, keep the same actor,
idempotency key and semantic request, including the original expected HEAD.
Replay can return the already-persisted result after HEAD has advanced. A
different request under the same key conflicts. To resolve a stale HEAD for an
uncommitted change, read HEAD, reconcile with the current snapshot, and submit
the resulting request with a new key.

## Limits and failure handling

| Budget                                     | Bytes   |
| ------------------------------------------ | ------- |
| Shared REST/MCP request body               | 262,144 |
| Creation and HEAD results                  | 1,024   |
| Commit result                              | 6,656   |
| CI request/status result                   | 1,024   |
| Receipt result and SDK tool result ceiling | 8,192   |

The request ceiling includes JSON/RPC overhead, matching the HTTP commit
ceiling. JSON escaping can make text that meets decoded limits exceed the wire
ceiling. Excessively escaped payloads can require smaller commits. Small
operations still admit only their fixed short argument fields. The commit
result allowance covers JSON escaping of the stored message plus commit
metadata. The receipt allowance matches the existing stored receipt budget.
The SDK adds its ordinary protocol envelope, and MCP includes both
`structuredContent` and a text representation.

Operation errors include `INVALID_INPUT`, `UNAUTHENTICATED`, `FORBIDDEN`,
`NOT_FOUND`, `CONFLICT`, `QUOTA_EXCEEDED` and `UNAVAILABLE`. REST status
distinguishes these failures. MCP operation errors use `isError: true`. The
SDK handles malformed envelopes, unknown tools and raw size rejection, and
identity failure can occur before a tool call is dispatched.

The owner verifies the original bearer a second time, applies persisted
ownership and delegates to existing transaction or CI code. Submitted text
is stored and inspected as data. No package scripts, source programs or
repository-supplied plugins execute. Babel still lacks an independently
established hard per-call CPU/memory boundary, and app-wide ingress and
admission limits require verification before public activation. See
[parser resource qualification](ci-parser-resource-qualification.md).
