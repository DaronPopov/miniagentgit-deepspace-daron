import { useState } from 'react'
import { ReadPanel } from './read-panel'
import type { Read } from './read-panel'
import { ReceiptPanel } from './receipt-panel'
import { job, jobsPage } from './ci-data'

export function CiPanel({
  base,
  read,
}: {
  readonly base: string
  readonly read: Read
}) {
  const [cursor, setCursor] = useState('')
  const [selected, setSelected] = useState('')
  const jobs = base + '/ci/jobs'
  return (
    <section
      aria-labelledby="ci-heading"
      className="site-surface dashboard-panel dashboard"
    >
      <h3 id="ci-heading" tabIndex={-1}>
        CI jobs
      </h3>
      <p>Jobs target immutable commits. Refresh to check for new activity.</p>
      {cursor && (
        <button
          className="site-button site-button-secondary"
          onClick={() => setCursor('')}
        >
          First job page
        </button>
      )}
      <ReadPanel
        refresh="Refresh CI jobs"
        path={
          jobs +
          '?' +
          new URLSearchParams({ limit: '4', ...(cursor ? { cursor } : {}) })
        }
        read={read}
        decode={jobsPage}
      >
        {(page) => (
          <>
            {!page.items.length && <p>No CI jobs on this page.</p>}
            {page.items.length > 0 && (
              <ul className="dashboard-list">
                {page.items.map((item) => (
                  <li key={item.id}>
                    <button
                      aria-pressed={selected === item.id}
                      className="site-button site-button-secondary site-button-compact"
                      onClick={() => setSelected(item.id)}
                      aria-label={`Inspect job ${item.id}`}
                    >
                      Inspect job
                    </button>
                    <span>
                      <strong data-ci-state={item.state}>{item.state}</strong>{' '}
                      <code>{item.id}</code>
                    </span>
                    <span>
                      Commit <code>{item.commitId}</code>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {page.nextCursor && (
              <button
                className="site-button site-button-secondary"
                onClick={() => setCursor(page.nextCursor ?? '')}
              >
                Next job page
              </button>
            )}
          </>
        )}
      </ReadPanel>
      {selected && (
        <div key={selected} className="dashboard">
          <h4>Job details</h4>
          <ReadPanel
            refresh="Refresh CI job"
            path={jobs + '/' + selected}
            read={read}
            decode={job}
          >
            {(value) => (
              <dl className="dashboard-details">
                <dt>Job ID</dt>
                <dd>
                  <code>{value.id}</code>
                </dd>
                <dt>Commit</dt>
                <dd>
                  <code>{value.commitId}</code>
                </dd>
                <dt>State</dt>
                <dd data-ci-state={value.state}>{value.state}</dd>
                <dt>Pipeline</dt>
                <dd>
                  {value.pipeline.id} · version {value.pipeline.version}
                </dd>
                <dt>Attempts</dt>
                <dd>{value.attempts}</dd>
                <dt>Updated</dt>
                <dd>{new Date(value.updatedAt).toISOString()}</dd>
                <dt>Result code</dt>
                <dd>
                  <code>{value.code}</code>
                </dd>
              </dl>
            )}
          </ReadPanel>
          <ReceiptPanel path={jobs + '/' + selected + '/receipt'} read={read} />
        </div>
      )}
    </section>
  )
}
