import { ReadPanel } from './read-panel'
import type { Read } from './read-panel'
import { receipt } from './ci-data'

export function ReceiptPanel({
  path,
  read,
}: {
  readonly path: string
  readonly read: Read
}) {
  return (
    <section aria-labelledby="receipt-heading" className="dashboard">
      <h4 id="receipt-heading">Durable receipt</h4>
      <ReadPanel
        path={path}
        refresh="Refresh receipt"
        read={read}
        decode={receipt}
        pending="Receipt pending. Refresh after the CI job settles."
      >
        {(value) => (
          <>
            <p>
              <strong data-ci-state={value.terminalState}>
                Receipt: {value.terminalState}
              </strong>
            </p>
            <dl className="dashboard-details">
              <dt>Job ID</dt>
              <dd>
                <code>{value.jobId}</code>
              </dd>
              <dt>Commit</dt>
              <dd>
                <code>{value.commitId}</code>
              </dd>
              <dt>Pipeline</dt>
              <dd>
                {value.pipeline.id} · version {value.pipeline.version}
              </dd>
              <dt>Fingerprint</dt>
              <dd>
                <code>{value.pipeline.fingerprint}</code>
              </dd>
              <dt>Receipt schema</dt>
              <dd>{value.schemaVersion}</dd>
              <dt>Completed</dt>
              <dd>{new Date(value.completedAt).toISOString()}</dd>
              <dt>Generation</dt>
              <dd>{value.generation}</dd>
              <dt>Result code</dt>
              <dd>
                <code>{value.code}</code>
              </dd>
              <dt>Scanned</dt>
              <dd>
                {value.files} files · {value.bytes} bytes · {value.work} work
                units
              </dd>
            </dl>
            <h5>Checks</h5>
            <ul>
              {Object.entries(value.checks).map(([name, result]) => (
                <li key={name}>
                  {name}: {result}
                </li>
              ))}
            </ul>
            <h5>Diagnostics</h5>
            {value.diagnostics.length ? (
              <ul>
                {value.diagnostics.map((item, index) => (
                  <li key={index}>
                    <code>
                      {item.check}/{item.code}
                      {item.path ? ' · ' + item.path : ''}
                      {item.line !== undefined ? ':' + item.line : ''}
                    </code>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No diagnostics.</p>
            )}
            {value.truncated && (
              <p>Diagnostics were truncated by the validator.</p>
            )}
          </>
        )}
      </ReadPanel>
    </section>
  )
}
