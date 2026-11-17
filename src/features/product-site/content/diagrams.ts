import type { ArchitectureDiagramMetadata } from '../contracts/presentation'

export const commitDiagram = {
  id: 'commit-lifecycle',
  title: 'Repository commit lifecycle',
  description:
    'Agent to HTTP API to authenticated repository authority to bounded commit scheduler to atomic SQLite commit and HEAD update. Only repository persistence advances HEAD. The in-memory scheduler is ephemeral, not durable job state.',
  nodes: [
    { id: 'agent', label: 'Agent' },
    { id: 'http', label: 'HTTP API' },
    { id: 'authority', label: 'Authenticated\nrepository authority' },
    { id: 'scheduler', label: 'Bounded commit\nscheduler' },
    { id: 'sqlite', label: 'Atomic SQLite\ncommit / HEAD' },
  ],
  connections: [
    { from: 'agent', to: 'http', label: 'submit' },
    { from: 'http', to: 'authority', label: 'verify and authorize' },
    { from: 'authority', to: 'scheduler', label: 'admit' },
    { from: 'scheduler', to: 'sqlite', label: 'execute transaction' },
  ],
} as const satisfies ArchitectureDiagramMetadata
export const ciDiagram = {
  id: 'ci-lifecycle',
  title: 'Asynchronous CI lifecycle',
  description:
    'Immutable commit to durable CI job to bounded fixed validators to persistent versioned receipt to agent or future dashboard. SQLite owns durable job state. CI never owns or updates HEAD. A dashboard is upcoming.',
  nodes: [
    { id: 'commit', label: 'Immutable commit' },
    { id: 'job', label: 'Durable CI job\nSQLite-owned state' },
    { id: 'validators', label: 'Bounded fixed\nvalidators' },
    { id: 'receipt', label: 'Persistent versioned\nreceipt' },
    { id: 'consumer', label: 'Agent / dashboard\nDashboard upcoming' },
  ],
  connections: [
    { from: 'commit', to: 'job', label: 'durable admission' },
    { from: 'job', to: 'validators', label: 'fenced claim' },
    { from: 'validators', to: 'receipt', label: 'persist outcome' },
    { from: 'receipt', to: 'consumer', label: 'authorized retrieval' },
  ],
} as const satisfies ArchitectureDiagramMetadata
export const diagramNotes = {
  commit:
    'Only the repository persistence authority advances HEAD. The in-memory commit scheduler orders work; it is not durable job state.',
  ci: 'CI reads immutable snapshots and writes only CI-owned rows. Durable jobs and receipts live in SQLite. CI never owns HEAD.',
} as const
