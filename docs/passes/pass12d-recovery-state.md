# PASS 12D recovery state

The registered app was undeployed at preflight. Its hosted persistent data
inventory remains unknown. No class, binding, migration, secret, route or
production state changed. The repository binding uses `RepositoryRoom`,
including the shared admission ledger, and the job binding uses the SDK class
`AppJobRoom`. Their migration identities remain as recorded in
`wrangler.toml` and `deepspace.migrations.json`.

Local restart and fresh-restore regression tests were rerun. Future hosted
reconnection can verify session-independent reads. Forced restart, restore and
suspension require a provider-supported non-destructive procedure first.
Preserve app identity, custom SQLite tables, owner mappings, commit and HEAD
integrity, job receipts and alarm recovery. Do not use undeploy to test
retention. [Recovery runbook](../operations/deployment-recovery.md)
