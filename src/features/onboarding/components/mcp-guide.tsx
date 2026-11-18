import { CodePanel } from './code-panel'

import { claudeSetup, codexSetup } from '../examples/commands'

const tools = [
  ['repository_create', '{name, idempotencyKey}', 'id, name, createdAt'],
  ['repository_head', '{repositoryId}', 'repositoryId, commitId, version'],
  [
    'repository_commit',
    '{repositoryId, expectedHead, idempotencyKey, message, changes}',
    'id, parentId, message, createdAt',
  ],
  [
    'ci_request',
    '{repositoryId, commitId, pipelineId?}',
    'Persisted job with id, commitId, pipeline and state',
  ],
  [
    'ci_status',
    '{repositoryId, jobId}',
    'Persisted job with state, generation and attempts',
  ],
  [
    'ci_receipt',
    '{repositoryId, jobId}',
    'Receipt with schemaVersion, terminalState, checks and diagnostics',
  ],
] as const

export function McpGuide() {
  return (
    <section
      id="mcp-guide"
      className="site-section"
      aria-labelledby="mcp-title"
    >
      <h2 id="mcp-title">Connect through native MCP</h2>
      <p>
        Use <code>POST /_deepspace/agent/mcp</code> on your operator’s trusted
        origin. Send <code>Authorization: Bearer &lt;TOKEN&gt;</code> with a
        supported user JWT or an agent JWT issued for that origin.
      </p>
      <p>
        The server verifies the signature, issuer, expiration and audience.
        Agent authorization also requires the agent scope and exact target
        origin. Each repository operation checks persisted ownership. Keep
        tokens private and out of URLs.
      </p>
      <p>
        Use stateless JSON-RPC requests. Call <code>initialize</code>, discover
        schemas with <code>tools/list</code> and invoke with{' '}
        <code>tools/call</code>. Check <code>isError</code> before reading{' '}
        <code>structuredContent</code>. REST discovery is available under{' '}
        <code>GET /_deepspace/agent/tools</code>.
      </p>
      <h3>Configure your coding client</h3>
      <p>
        Replace <code>YOUR-TRUSTED-HOST</code> with the hostname confirmed by
        your operator. Load an unexpired, origin-bound agent token into
        <code> MINIGIT_AGENT_TOKEN</code> in the environment that launches your
        client. Keep the token in your local secret store.
      </p>
      <CodePanel
        id="mcp-codex"
        title="Codex CLI · Terminal"
        command={codexSetup}
      />
      <p>
        For Claude Code, merge this server entry into your project’s{' '}
        <code>.mcp.json</code>. Keep the variable reference literal so Claude
        Code can resolve it at launch.
      </p>
      <CodePanel
        id="mcp-claude"
        title="Claude Code · .mcp.json"
        command={claudeSetup}
      />
      <p>
        Codex completed the six-tool workflow against the local Worker. Hosted
        credentials and Claude Code interoperability still require testing. HTTP
        503 indicates that the operator should check server admission before
        retrying.
      </p>
      <h3>Available tools</h3>
      <dl className="docs-mcp-tools">
        {tools.map(([name, input, output]) => (
          <div className="site-surface" key={name}>
            <dt>
              <code>miniagentgit.{name}</code>
            </dt>
            <dd>
              <strong>Input</strong> <code>{input}</code>
            </dd>
            <dd>
              <strong>Result</strong> {output}
            </dd>
          </div>
        ))}
      </dl>
      <h3>From first commit to a passing receipt</h3>
      <ol>
        <li>
          Authenticate, discover tools, and create a repository with a stable
          creation key. Save the returned ID.
        </li>
        <li>
          Read HEAD. An empty repository returns <code>commitId: null</code> and
          version <code>0</code>.
        </li>
        <li>
          Commit a <code>put</code> for <code>src/main.ts</code> importing{' '}
          <code>./dep</code> with a final newline,{' '}
          <code>expectedHead: null</code> and a new commit key.
        </li>
        <li>
          Request CI for that commit. Acceptance returns a job ID. Check status
          and read the terminal receipt with the missing-import diagnostic.
        </li>
        <li>
          Commit a newline-terminated <code>src/dep.ts</code> that exports the
          imported symbol. Use the first commit as <code>expectedHead</code> and
          a fresh commit key.
        </li>
        <li>
          Request CI for the corrected commit, check status, and retrieve its
          passing receipt. The original receipt remains available.
        </li>
        <li>
          Sign in and{' '}
          <a href="/dashboard">open the repository in the dashboard</a> using
          its ID.
        </li>
      </ol>
      <p>
        On an uncertain mutation outcome, retry the same intent and idempotency
        key. On stale HEAD, read HEAD and reconcile before submitting a new
        intent. A pending receipt calls for a later status check.
      </p>
      <p>
        <a href="https://github.com/DaronPopov/miniagentgit-deepspace-daron/blob/main/docs/mcp-repository-workflow.md">
          Tool contracts and limits
        </a>{' '}
        · <a href="#quick-start">HTTP examples in PowerShell and curl.exe</a>
      </p>
    </section>
  )
}
