import './styles.css'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { CiPanel } from './ci-panel'
import { CommitPanel } from './commit-panel'
import { ReadPanel } from './read-panel'
import type { Read } from './read-panel'
import { head, id, repository } from './repository-data'

export function Dashboard({ read }: { readonly read: Read }) {
  const [selection, setSelection] = useState('')
  const [invalid, setInvalid] = useState(false)
  function open(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const candidate = new FormData(event.currentTarget).get('repository')
    const value = typeof candidate === 'string' ? candidate.trim() : ''
    setInvalid(!id(value))
    setSelection(id(value) ? value : '')
  }
  const base = '/api/repositories/' + selection
  return (
    <section aria-labelledby="repositories-title" className="dashboard">
      <div className="site-surface dashboard-panel">
        <h2 id="repositories-title">Open a repository</h2>
        <p>Enter the repository ID returned by the API or MCP tool.</p>
        <form onSubmit={open} className="dashboard-form">
          <label htmlFor="repository-id">Repository ID</label>
          <div className="dashboard-actions">
            <input
              id="repository-id"
              name="repository"
              type="text"
              maxLength={37}
              autoCapitalize="off"
              spellCheck={false}
              aria-invalid={invalid}
              aria-describedby={invalid ? 'repository-error' : undefined}
              placeholder="repo_…"
            />
            <button className="site-button" type="submit">
              Open repository
            </button>
          </div>
        </form>
        {invalid && (
          <p id="repository-error" role="status">
            Enter a valid repository ID (repo_ followed by 16–32 lowercase
            letters or digits).
          </p>
        )}
      </div>
      {selection && (
        <div key={selection} className="dashboard">
          <ReadPanel
            refresh="Refresh repository"
            path={base}
            read={read}
            decode={repository}
          >
            {(value) => (
              <>
                <div className="site-surface dashboard-panel">
                  <h2>{value.name}</h2>
                  <dl className="dashboard-details">
                    <dt>Repository ID</dt>
                    <dd>
                      <code>{value.id}</code>
                    </dd>
                    <dt>Created</dt>
                    <dd>{value.createdAt}</dd>
                  </dl>
                  <nav
                    aria-label="Repository sections"
                    className="dashboard-actions"
                  >
                    <a href="#dashboard-head">Commit and files</a>
                    <a href="#ci-heading">CI jobs</a>
                  </nav>
                </div>
                <div className="dashboard-workspace">
                  <div className="site-surface dashboard-panel">
                    <ReadPanel
                      refresh="Refresh HEAD"
                      path={base + '/head'}
                      read={read}
                      decode={head}
                    >
                      {(value) => (
                        <>
                          <h3 id="dashboard-head" tabIndex={-1}>
                            Current HEAD
                          </h3>
                          <p>HEAD version {value.version}</p>
                          {value.commitId ? (
                            <CommitPanel
                              key={value.commitId}
                              base={base}
                              root={value.commitId}
                              read={read}
                            />
                          ) : (
                            <p>
                              Empty HEAD. This repository has no commits yet.
                            </p>
                          )}
                        </>
                      )}
                    </ReadPanel>
                  </div>
                  <CiPanel base={base} read={read} />
                </div>
              </>
            )}
          </ReadPanel>
        </div>
      )}
    </section>
  )
}
