import type { Database } from '../storage/database'
import { numberColumn } from '../storage/database'

export const admissionRoom = 'control:miniagentgit-admission:v1'
export const limits = Object.freeze({
  auth: 32,
  token: 192,
  protected: 256,
  concurrency: 16,
  ci: 12,
  repositories: 4,
  routes: 16,
})
export type WindowLane = 'auth' | 'token' | 'protected' | 'ci'

export function initializeAdmission(db: Database) {
  db.run(`CREATE TABLE IF NOT EXISTS admission_windows (
    lane TEXT PRIMARY KEY, bucket INTEGER NOT NULL, used INTEGER NOT NULL
  )`)
  db.run('CREATE TABLE IF NOT EXISTS admission_active (id TEXT PRIMARY KEY)')
  db.run(`CREATE TABLE IF NOT EXISTS admission_routes (
    id TEXT PRIMARY KEY, creation INTEGER NOT NULL CHECK (creation IN (0,1))
  )`)
}
export function spendWindow(db: Database, lane: WindowLane, now: number) {
  if (!Number.isSafeInteger(now) || now < 0)
    throw new Error('Invalid admission clock')
  const bucket = Math.floor(now / 60_000)
  return db.transaction(() => {
    const old = db.all(
      'SELECT bucket, used FROM admission_windows WHERE lane = ?',
      lane,
    )[0]
    const prior = old ? numberColumn(old, 'bucket') : bucket
    const used = old && bucket <= prior ? numberColumn(old, 'used') : 0
    if (used >= limits[lane]) return false
    db.run(
      `INSERT INTO admission_windows VALUES (?, ?, ?)
      ON CONFLICT(lane) DO UPDATE SET bucket = excluded.bucket, used = excluded.used`,
      lane,
      Math.max(prior, bucket),
      used + 1,
    )
    return true
  })
}
function routeCount(db: Database, createsOnly: boolean) {
  const sql =
    'SELECT count(*) AS n FROM admission_routes' +
    (createsOnly ? ' WHERE creation = 1' : '')
  const row = db.all(sql)[0]
  if (!row) throw new Error('Admission count unavailable')
  return numberColumn(row, 'n')
}
export function reserveRoute(db: Database, id: string, create: boolean) {
  return db.transaction(() => {
    const old = db.all(
      'SELECT creation FROM admission_routes WHERE id = ?',
      id,
    )[0]
    if (old && (!create || numberColumn(old, 'creation') === 1))
      return 'accepted'
    if (create && routeCount(db, true) >= limits.repositories)
      return 'repositories'
    if (!old && routeCount(db, false) >= limits.routes) return 'routes'
    db.run(
      `INSERT INTO admission_routes VALUES (?, ?)
      ON CONFLICT(id) DO UPDATE SET creation = excluded.creation`,
      id,
      create ? 1 : 0,
    )
    return 'accepted'
  })
}

export function acquireProtected(db: Database, id: string, now: number) {
  if (!spendWindow(db, 'protected', now)) return 'protected'
  return db.transaction(() => {
    const row = db.all('SELECT count(*) AS n FROM admission_active')[0]
    if (!row) throw new Error('Admission count unavailable')
    if (numberColumn(row, 'n') >= limits.concurrency) return 'concurrency'
    db.run('INSERT INTO admission_active VALUES (?)', id)
    return 'accepted'
  })
}
export function releaseProtected(db: Database, id: string) {
  db.run('DELETE FROM admission_active WHERE id = ?', id)
}
