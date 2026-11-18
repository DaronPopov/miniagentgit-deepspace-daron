import { useState } from 'react'
import { ReadPanel } from './read-panel'
import type { Read } from './read-panel'
import { commit, file, treePage } from './repository-data'

export function CommitPanel({
  base,
  root,
  read,
}: {
  readonly base: string
  readonly root: string
  readonly read: Read
}) {
  const [selected, setSelected] = useState({ id: root, depth: 0 })
  return (
    <section aria-labelledby="commit-heading" className="dashboard">
      <code>{root}</code>
      <h4 id="commit-heading">Commit details</h4>
      {selected.id !== root && (
        <button
          className="site-button site-button-secondary"
          onClick={() => setSelected({ id: root, depth: 0 })}
        >
          Return to HEAD
        </button>
      )}
      <ReadPanel
        refresh="Refresh commit"
        path={base + '/commits/' + selected.id}
        read={read}
        decode={commit}
      >
        {(value) => (
          <>
            <p className="dashboard-message">{value.message}</p>
            <dl className="dashboard-details">
              <dt>Commit ID</dt>
              <dd>
                <code>{value.id}</code>
              </dd>
              <dt>Parent</dt>
              <dd>
                {value.parentId ? <code>{value.parentId}</code> : 'Root commit'}
              </dd>
              <dt>Author</dt>
              <dd>{value.author.subject}</dd>
              <dt>Committed</dt>
              <dd>{value.createdAt}</dd>
            </dl>
            {value.parentId && selected.depth < 32 && (
              <button
                className="site-button site-button-secondary"
                onClick={() =>
                  setSelected({
                    id: value.parentId ?? root,
                    depth: selected.depth + 1,
                  })
                }
              >
                Open parent commit
              </button>
            )}
            {value.parentId && selected.depth === 32 && (
              <p>Parent navigation is limited to 32 steps from HEAD.</p>
            )}
            <Files
              key={selected.id}
              base={base}
              commitId={selected.id}
              read={read}
            />
          </>
        )}
      </ReadPanel>
    </section>
  )
}

function Files({
  base,
  commitId,
  read,
}: {
  readonly base: string
  readonly commitId: string
  readonly read: Read
}) {
  const [cursor, setCursor] = useState('')
  const [selected, setSelected] = useState('')
  const query = new URLSearchParams({ commit: commitId, limit: '12' })
  if (cursor) query.set('cursor', cursor)
  return (
    <section aria-labelledby="files-heading" className="dashboard">
      <h5 id="files-heading">Committed files</h5>
      {cursor && (
        <button
          className="site-button site-button-secondary"
          onClick={() => setCursor('')}
        >
          First file page
        </button>
      )}
      <ReadPanel
        refresh="Refresh files"
        path={base + '/tree?' + query}
        read={read}
        decode={treePage}
      >
        {(page) => (
          <>
            {!page.items.length && (
              <p>This commit has no files on this page.</p>
            )}
            {page.items.length > 0 && (
              <ul className="dashboard-list">
                {page.items.map((item) => (
                  <li key={item.path}>
                    <button
                      aria-pressed={selected === item.path}
                      className="site-button site-button-secondary site-button-compact"
                      onClick={() => setSelected(item.path)}
                    >
                      <code>{item.path}</code>
                    </button>
                    <span>{item.utf8Bytes} bytes</span>
                  </li>
                ))}
              </ul>
            )}
            {page.nextCursor && (
              <button
                className="site-button site-button-secondary"
                onClick={() => setCursor(page.nextCursor ?? '')}
              >
                Next file page
              </button>
            )}
          </>
        )}
      </ReadPanel>
      {selected && (
        <section aria-label="File preview">
          <h6>
            <code>{selected}</code>
          </h6>
          <ReadPanel
            refresh="Refresh file preview"
            path={
              base +
              '/files/' +
              commitId +
              '?' +
              new URLSearchParams({ path: selected })
            }
            read={read}
            decode={file}
          >
            {(text) =>
              text ? (
                <pre
                  className="dashboard-source"
                  tabIndex={0}
                  aria-label="Committed source text"
                >
                  <code>{text}</code>
                </pre>
              ) : (
                <p>This file is empty.</p>
              )
            }
          </ReadPanel>
        </section>
      )}
    </section>
  )
}
