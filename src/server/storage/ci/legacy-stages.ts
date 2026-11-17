import { ciLimits } from '../../../application/ci/limits'
import type { Database } from '../database'
import { jobRow, nextGeneration } from './rows'
import { writeTerminal } from './writes'

export function interruptLegacyStages(db: Database) {
  const limits = ciLimits()
  const rows = db.all(
    "SELECT * FROM ci_jobs WHERE pipeline_version=2 AND state IN ('queued','running') ORDER BY seq LIMIT ?",
    limits.outstanding,
  )
  const now = Date.now()
  for (const row of rows) {
    const job = jobRow(row)
    writeTerminal(
      db,
      { ...job, generation: nextGeneration(job) },
      'interrupted',
      'pipeline_unavailable',
      now,
      limits,
    )
  }
}
