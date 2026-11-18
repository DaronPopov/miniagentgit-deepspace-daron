# PASS 12D real coding-agent execution

**Local native MCP PASS. Hosted execution unverified.**

Codex CLI 0.169.0 ran one non-interactive ChatGPT-authenticated session
against the production build on an isolated loopback workerd preview.
The local Worker used its SQLite repository and job bindings. The client was
configured per invocation with
`mcp_servers.miniagentgit.url` set to
`http://127.0.0.1:<port>/_deepspace/agent/mcp`
and `mcp_servers.miniagentgit.bearer_token_env_var` set to an environment
variable name. The launcher generated an ephemeral P-256 test identity,
minted a short-lived agent-scoped bearer for the exact preview origin,
and passed it directly in the child environment. The client used native
HTTP MCP without a bridge. No global client configuration changed.

To reproduce, build with `npm run build` and use the Miniflare configuration
in `scripts/preview-frontend.mjs` with `tests/identity-fixture.ts` as the
local signer. Set the preview allowlist to the test subject. In the private
launcher process, use the fixture's JWT issuer plus `/agent`, the resolved
loopback origin as audience, and `scope: agent`. Launch
`codex exec --sandbox read-only --skip-git-repo-check --json` with the two
MCP config overrides above. Keep the bearer in memory and omit it from the
prompt and logs. Direct the client through the sequence in the
[MCP workflow](../mcp-repository-workflow.md), with at most five status reads
per job. The operator supplied the fixtures and expected outcomes.
Codex independently issued native tool calls and interpreted their results.

Repository ID: `repo_d9a9c1f54ae317feb8ecab14da3d7492`.

| Evidence             | Failing snapshot                                                         | Corrected snapshot                                                    |
| -------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Commit               | `632cf197a0c6a906f8a029a9987646dc5c88866ea33fcdcc5649c5308baecfcb`       | `025ed943dc1c9504a4db0d8d436a63bfdb447613bc40de81f76d53f8d2b00653`    |
| Job                  | `ci_0e9694bc3a29ce90ebf747aef349cf2591c2831a8b0b33ba0c9014ee804768f0`    | `ci_4ad78b53a0640b13abceb00f176c3697ff80e8cd2773249a2451882b9cf34948` |
| Admission and status | Queued then failed                                                       | Queued then passed                                                    |
| Schema 2 receipt     | `checks_failed`, imports failed with `missing_import` at `src/main.ts:1` | All five active checks passed, no diagnostics                         |
| TypeScript semantics | Deferred                                                                 | Deferred                                                              |

The 17 recorded invocations exercised all six registered methods.
`repository_create` returned the ID, `repository_head` saw empty HEAD
at version 0, and `repository_commit` produced the two parent-linked
commits. Each `ci_request` returned queued, one `ci_status` read found
each terminal outcome, and `ci_receipt` returned both receipts again
after HEAD advanced. An identical second-commit replay returned its
original commit ID. A fresh-key request with stale expected HEAD
returned `CONFLICT`. The following HEAD read still returned the
second commit at version 2.
