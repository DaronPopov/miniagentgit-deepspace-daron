import type { AgentConnection } from './contracts'

export function ConnectionDetails({
  connection,
}: {
  readonly connection: AgentConnection
}) {
  return (
    <section className="agent-connection" aria-label="MCP connection details">
      <h4>Connection details</h4>
      <dl>
        <dt>Transport</dt>
        <dd>{connection.transport}</dd>
        <dt>Qualification</dt>
        <dd>{connection.qualification}</dd>
        <dt>Authentication</dt>
        <dd>{connection.authentication}</dd>
        <dt>Endpoint pattern — inactive</dt>
        <dd>
          <code>{connection.endpoint}</code>
        </dd>
      </dl>
      <h4>Supported tool</h4>
      <ul>
        {connection.tools.map((tool) => (
          <li key={tool}>
            <code>{tool}</code> — read the owner-authorized repository HEAD.
          </li>
        ))}
      </ul>
      <p>{connection.limitations}</p>
    </section>
  )
}
