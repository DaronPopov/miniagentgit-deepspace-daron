import type {
  CiCode,
  CiJob,
  CiState,
  CiValidation,
} from '../../../contracts/ci'
import type { CiLimits } from '../../../application/ci/limits'
import { ciReceipt } from '../../../application/ci/receipt'
import type { Database } from '../database'
import { jobRow } from './rows'

export function findJob(db: Database, id: string): CiJob | undefined {
  const row = db.all('SELECT * FROM ci_jobs WHERE id=?', id)[0]
  return row ? jobRow(row) : undefined
}
export function writeTerminal(
  db: Database,
  job: CiJob,
  state: Exclude<CiState, 'queued' | 'running'>,
  code: CiCode,
  now: number,
  limits: CiLimits,
  validation?: CiValidation,
): CiJob {
  const receipt = ciReceipt(job, state, code, now, limits, validation)
  db.run(
    'UPDATE ci_jobs SET state=?, code=?, generation=?, updated_ms=? WHERE id=?',
    receipt.terminalState,
    receipt.code,
    job.generation,
    now,
    job.id,
  )
  db.run(
    'INSERT INTO ci_receipts VALUES (?,?,?)',
    job.id,
    job.generation,
    JSON.stringify(receipt),
  )
  const result = findJob(db, job.id)
  if (!result) throw new Error('CI terminal write failed')
  return result
}
