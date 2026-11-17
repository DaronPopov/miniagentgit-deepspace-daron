import type { Database } from '../storage/database'
export function durableDatabase(storage: DurableObjectStorage): Database {
  return {
    all: (sql, ...values) => storage.sql.exec(sql, ...values).toArray(),
    run: (sql, ...values) => {
      storage.sql.exec(sql, ...values)
    },
    transaction: (closure) => storage.transactionSync(closure),
  }
}
