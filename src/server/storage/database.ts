export type SqlValue = string | number | null
export type SqlRow = Readonly<Record<string, unknown>>
/** Synchronous SQL only; implementations must roll back the closure on throw. */
export interface Database {
  readonly all: (
    sql: string,
    ...values: readonly SqlValue[]
  ) => readonly SqlRow[]
  readonly run: (sql: string, ...values: readonly SqlValue[]) => void
  readonly transaction: <T>(closure: () => T) => T
}
export function stringColumn(row: SqlRow, key: string): string {
  const value = row[key]
  if (typeof value !== 'string') throw new Error('Invalid persisted string')
  return value
}
export function numberColumn(row: SqlRow, key: string): number {
  const value = row[key]
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new Error('Invalid persisted counter')
  return value
}
export function nullableString(row: SqlRow, key: string): string | null {
  return row[key] === null ? null : stringColumn(row, key)
}
