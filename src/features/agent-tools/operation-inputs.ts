import { validateCommit } from '../../application/validate-commit'
import { validateCreateRepository } from '../../application/validate-inputs'
import { repositoryIdentity } from '../../domain/commit-hashing'
import type { Principal } from '../../domain/repository'
import { invalid, success } from '../../domain/result'
import { commitId, objectValue, repositoryId } from '../../domain/validation'

export const AGENT_BASE = '/_deepspace/agent'
export const AGENT_REPOSITORIES = AGENT_BASE + '/repositories'

export const operations = [
  'repository_create',
  'repository_commit',
  'ci_request',
  'ci_status',
  'ci_receipt',
] as const
export type Operation = (typeof operations)[number]

export async function ownerOperation(
  operation: Operation,
  input: unknown,
  actor: Principal,
) {
  if (operation === 'repository_create') {
    const parsed = validateCreateRepository(input)
    if (!parsed.ok) return parsed
    const id = await repositoryIdentity(actor, parsed.value.idempotencyKey)
    return success({ id, suffix: '', method: 'PUT', body: parsed.value })
  }
  if (!objectValue(input)) return invalid('Expected operation arguments')
  const { repositoryId: rawId, ...fields } = input
  const id = repositoryId(rawId)
  if (!id.ok) return id
  if (operation === 'repository_commit') {
    const parsed = validateCommit(fields)
    return parsed.ok
      ? success({
          id: id.value,
          suffix: '/commits',
          method: 'POST',
          body: parsed.value,
        })
      : parsed
  }
  if (operation === 'ci_request') {
    const { commitId: rawCommit, ...body } = fields
    const commit = commitId(rawCommit)
    if (!commit.ok) return commit
    if (
      Object.keys(body).some((key) => key !== 'pipelineId') ||
      (body.pipelineId !== undefined &&
        body.pipelineId !== 'miniagentgit-ci-v1')
    )
      return invalid('Invalid CI pipeline request')
    return success({
      id: id.value,
      suffix: '/ci/commits/' + commit.value,
      method: 'POST',
      body,
    })
  }
  const job = fields.jobId
  if (
    Object.keys(fields).length !== 1 ||
    typeof job !== 'string' ||
    !/^ci_[a-f0-9]{64}$/.test(job)
  )
    return invalid('Invalid CI job arguments')
  return success({
    id: id.value,
    suffix: '/ci/jobs/' + job + (operation === 'ci_receipt' ? '/receipt' : ''),
    method: 'GET',
  })
}
