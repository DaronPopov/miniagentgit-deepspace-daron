import source from '../../ci-source-fingerprint.json'
import { sha256 } from '../../domain/commit-hashing'
import type { CiPipeline } from '../../contracts/ci'
import type { CiLimits } from './limits'

export const CI_PIPELINES = Object.freeze([
  { id: 'miniagentgit-ci-v1', version: 1 },
] as const)
export async function ciPipeline(
  limits: CiLimits,
  staged = false,
): Promise<CiPipeline> {
  const definition = { ...CI_PIPELINES[0], version: staged ? 2 : 1 }
  return Object.freeze({
    ...definition,
    fingerprint: await sha256(
      JSON.stringify([
        'pipeline-fingerprint-v1',
        source.sourceFingerprint,
        definition,
        limits,
      ]),
    ),
  })
}

export const ciJobIdentity = async (
  repository: string,
  commit: string,
  pipeline: CiPipeline,
) =>
  `ci_${await sha256(JSON.stringify(['ci-job-v1', repository, commit, pipeline.id, pipeline.version, pipeline.fingerprint]))}`
