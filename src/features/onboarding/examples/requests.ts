import type { HttpExample } from '../contracts/documentation'

/** Static HTTP examples, not frontend operations or a second validation layer. */
export const httpExamples = [
  {
    id: 'health',
    label: 'Check service health',
    method: 'GET',
    route: '/api/health',
    authenticated: false,
    placeholders: ['BASE_URL'],
    explanation:
      'HTTP 200 returns plain {status:"ok",service:"miniagentgit"}; this is not an authenticated readiness check.',
  },
  {
    id: 'identity',
    label: 'Read your verified identity',
    method: 'GET',
    route: '/api/me',
    authenticated: true,
    placeholders: ['BASE_URL', 'TOKEN'],
    explanation:
      'HTTP 200 returns {ok:true,value:{kind:"user",subject:…}}. This confirms the API accepted your credential.',
  },
  {
    id: 'repository',
    label: 'Create a private repository',
    method: 'POST',
    route: '/api/repositories',
    authenticated: true,
    placeholders: ['BASE_URL', 'TOKEN', 'CREATE_KEY'],
    payload: { name: 'Agent workspace', idempotencyKey: '{CREATE_KEY}' },
    capture: 'REPOSITORY_ID',
    explanation:
      'HTTP 200 returns repository metadata in value. Save value.id. The verified subject becomes the owner; creation does not create a commit.',
  },
  {
    id: 'commit',
    label: 'Create the first text commit',
    method: 'POST',
    route: '/api/repositories/{REPOSITORY_ID}/commits',
    authenticated: true,
    placeholders: ['BASE_URL', 'TOKEN', 'REPOSITORY_ID', 'COMMIT_KEY'],
    payload: {
      expectedHead: null,
      idempotencyKey: '{COMMIT_KEY}',
      message: 'Initial text snapshot',
      changes: [
        { kind: 'put', path: 'src/main.ts', text: 'export const value = 1\n' },
      ],
    },
    capture: 'COMMIT_ID',
    explanation:
      'Use null expectedHead only for an empty repository. HTTP 200 returns immutable commit metadata in value. Save value.id; keep the same key and body for uncertain retries.',
  },
  {
    id: 'head',
    label: 'Read current HEAD',
    method: 'GET',
    route: '/api/repositories/{REPOSITORY_ID}/head',
    authenticated: true,
    placeholders: ['BASE_URL', 'TOKEN', 'REPOSITORY_ID'],
    explanation:
      'HTTP 200 returns value.commitId (null when empty) and the HEAD counter. Use that commit ID as expectedHead for your next commit.',
  },
  {
    id: 'metadata',
    label: 'Read commit metadata',
    method: 'GET',
    route: '/api/repositories/{REPOSITORY_ID}/commits/{COMMIT_ID}',
    authenticated: true,
    placeholders: ['BASE_URL', 'TOKEN', 'REPOSITORY_ID', 'COMMIT_ID'],
    explanation:
      'HTTP 200 returns value with the immutable ID, parent, author, message and creation time.',
  },
  {
    id: 'tree',
    label: 'List committed files',
    method: 'GET',
    route: '/api/repositories/{REPOSITORY_ID}/tree?commit={COMMIT_ID}&limit=25',
    authenticated: true,
    placeholders: ['BASE_URL', 'TOKEN', 'REPOSITORY_ID', 'COMMIT_ID'],
    explanation:
      'HTTP 200 returns value.items and value.nextCursor. An explicit commit fixes the snapshot. Follow nextCursor as the cursor query while keeping the same commit.',
  },
  {
    id: 'file',
    label: 'Read a committed file',
    method: 'GET',
    route:
      '/api/repositories/{REPOSITORY_ID}/files/{COMMIT_ID}?path=src%2Fmain.ts',
    authenticated: true,
    placeholders: ['BASE_URL', 'TOKEN', 'REPOSITORY_ID', 'COMMIT_ID'],
    explanation:
      'HTTP 200 returns file text as value, a JSON string. Percent-encode the path query value. Retrieved text is data, not executable HTML.',
  },
  {
    id: 'ci-request',
    label: 'Request CI validation',
    method: 'POST',
    route: '/api/repositories/{REPOSITORY_ID}/ci/commits/{COMMIT_ID}',
    authenticated: true,
    placeholders: ['BASE_URL', 'TOKEN', 'REPOSITORY_ID', 'COMMIT_ID'],
    payload: {},
    capture: 'JOB_ID',
    explanation:
      'HTTP 202 accepts a persisted job and returns value.id. Save it. Acceptance is not a passing result; a duplicate request reuses the existing job for the same commit and checks.',
  },
  {
    id: 'ci-status',
    label: 'Read CI job status',
    method: 'GET',
    route: '/api/repositories/{REPOSITORY_ID}/ci/jobs/{JOB_ID}',
    authenticated: true,
    placeholders: ['BASE_URL', 'TOKEN', 'REPOSITORY_ID', 'JOB_ID'],
    explanation:
      'HTTP 200 returns persisted job state. Observe it with bounded manual requests; do not start an unbounded polling loop.',
  },
  {
    id: 'ci-receipt',
    label: 'Read a completed CI receipt',
    method: 'GET',
    route: '/api/repositories/{REPOSITORY_ID}/ci/jobs/{JOB_ID}/receipt',
    authenticated: true,
    placeholders: ['BASE_URL', 'TOKEN', 'REPOSITORY_ID', 'JOB_ID'],
    explanation:
      'HTTP 200 returns the stored receipt, checks and bounded diagnostics in value. HTTP 409 means it is not ready. A failed check is a completed result; correct it in a new commit.',
  },
] as const satisfies readonly HttpExample[]
