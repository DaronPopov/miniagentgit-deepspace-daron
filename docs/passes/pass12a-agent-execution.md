# PASS 12A agent execution

**Hosted execution unverified.** The predeployment gate blocked exposure.
No agent was connected, no hosted credential was issued, and no hosted
repository or receipt IDs were created. No scripted protocol test was
counted as a coding-agent run.

Codex CLI 0.169.0 and Claude Code 2.1.322 are installed. Codex help advertises
a Streamable HTTP URL and bearer token sourced by environment variable.
This is a candidate configuration for a future isolated client. Whether the
client accepts DeepSpace's stateless JSON-RPC handshake and tool results,
including `isError`, remains unverified. No client configuration was changed.

The installed SDK and [local tool guide](https://docs.deep.space/guides/local-agent-tools)
describe the managed session exchange for an origin-scoped bearer. The
portable agent-account flow is documented separately for staging. The CLI
`agent tools` command can exercise the native tool service but would not
establish external coding-agent compatibility.

## Tool and workflow evidence boundary

PASS 10A and the current local regression suite verified the existing native
tool contracts using an SDK client and local workerd. The six expected
names are `miniagentgit.repository_create`, `miniagentgit.repository_head`,
`miniagentgit.repository_commit`, `miniagentgit.ci_request`,
`miniagentgit.ci_status` and `miniagentgit.ci_receipt`. Their schemas and the
two-commit workflow are in the [MCP workflow](../mcp-repository-workflow.md).
These are expected tool names, not hosted discovery results.

After ingress is qualified, keep a real production token in the isolated
client environment. Probe initialize and discovery, examine safe tool
errors, then direct the real agent through the two commits and two jobs.
Record what the operator directed and what the agent selected. Verify the
new HEAD and earlier durable receipt after reconnecting. Capture only tool
names, sanitized arguments/results, request counts, timing and repository
artifacts. A second approved account is required for hosted isolation.
