import { CI_DEFAULT_LIMITS } from '../../application/ci/limits'
import { FREE_TIER_LIMITS as limits } from '../../application/resource-limits'
import { enumeration, integer, object, string } from './json-schema'

const hex = string(64, '^[a-f0-9]{64}$')
const nullableCommit = { anyOf: [hex, { type: 'null' }] } as const
const repositoryId = string(37, '^repo_[a-z0-9]{16,32}$')
const jobId = string(67, '^ci_[a-f0-9]{64}$')
const name = string(64, '^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$')
const idempotencyKey = string(64, '^[A-Za-z0-9_-]{16,64}$')
const path = {
  ...string(
    240,
    String.raw`^(?!.*[^\x21-\x7e])(?!.*(?:^|/)\.{1,2}(?:/|$))[^/\\:%?#]+(?:/[^/\\:%?#]+)*(?![\s\S])`,
  ),
  description: 'Relative printable ASCII path without traversal or aliases.',
}
const message = {
  ...string(limits.messageBytes),
  minLength: 1,
  description: 'Nonblank well-formed text, maximum 1024 UTF-8 bytes.',
}
const text = {
  ...string(limits.fileBytes),
  description: 'Well-formed text without NUL, maximum 32768 UTF-8 bytes.',
}
const pipelineId = enumeration('miniagentgit-ci-v1')
export const operationInputs = {
  repository_create: object({ name, idempotencyKey }),
  repository_commit: object({
    repositoryId,
    expectedHead: nullableCommit,
    idempotencyKey,
    message,
    changes: {
      type: 'array',
      minItems: 1,
      maxItems: limits.changesPerCommit,
      description:
        'Unique paths and at most 131072 UTF-8 bytes of submitted text.',
      items: {
        anyOf: [
          object({ kind: enumeration('put'), path, text }),
          object({ kind: enumeration('delete'), path }),
        ],
      },
    },
  }),
  ci_request: object({ repositoryId, commitId: hex, pipelineId }, [
    'pipelineId',
  ]),
  ci_status: object({ repositoryId, jobId }),
  ci_receipt: object({ repositoryId, jobId }),
}

const pipeline = object({ id: pipelineId, version: integer, fingerprint: hex })
const terminal = [
  'passed',
  'failed',
  'cancelled',
  'expired',
  'interrupted',
] as const
const code = enumeration(
  'none',
  'checks_failed',
  'integrity_failed',
  'validator_exception',
  'input_limit',
  'work_limit',
  'output_limit',
  'deadline',
  'cancelled',
  'recovered',
  'attempts_exhausted',
  'pipeline_unavailable',
  'generation_exhausted',
)
const checkNames = ['manifest', 'source', 'syntax', 'lint', 'imports'] as const
const checkState = enumeration('passed', 'failed', 'skipped')
const checks = object(
  {
    manifest: checkState,
    source: checkState,
    syntax: checkState,
    lint: checkState,
    imports: checkState,
    typescript: enumeration('deferred'),
  },
  ['syntax', 'lint', 'imports'],
)
const job = object({
  id: jobId,
  repositoryId,
  commitId: hex,
  pipeline,
  state: enumeration('queued', 'running', ...terminal),
  generation: integer,
  attempts: integer,
  createdAt: integer,
  updatedAt: integer,
  deadline: integer,
  code,
})
export const operationOutputs = {
  repository_create: object({ id: repositoryId, name, createdAt: string(32) }),
  repository_commit: object({
    id: hex,
    parentId: nullableCommit,
    message,
    createdAt: string(32),
  }),
  ci_request: job,
  ci_status: job,
  ci_receipt: object({
    schemaVersion: enumeration(1, 2),
    jobId,
    repositoryId,
    commitId: hex,
    pipeline,
    generation: integer,
    completedAt: integer,
    terminalState: enumeration(...terminal),
    state: enumeration('passed', 'failed'),
    code,
    checks,
    diagnostics: {
      type: 'array',
      maxItems: CI_DEFAULT_LIMITS.diagnostics,
      items: object(
        {
          check: enumeration(...checkNames),
          code: string(64),
          path: string(240),
          line: integer,
        },
        ['path', 'line'],
      ),
    },
    truncated: { type: 'boolean' },
    files: integer,
    bytes: integer,
    work: integer,
  }),
}
