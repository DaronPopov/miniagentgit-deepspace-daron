import { enqueueJob } from 'deepspace/worker'
import type { CiDispatch } from '../../application/ci/stages'

export const jobType = 'miniagentgit-ci-stage'

export function enqueueCi(
  namespace: DurableObjectNamespace,
  payload: CiDispatch,
) {
  return enqueueJob(namespace, payload.ciJobId, jobType, payload, {
    maxAttempts: 1,
  })
}
