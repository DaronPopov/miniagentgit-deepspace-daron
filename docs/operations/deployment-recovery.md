# MiniAgentGit deployment and recovery

## Durable state inventory

RepositoryRoom SQLite owns repository metadata and ownership, immutable
content/manifests and commit lineage, HEAD/version, idempotency receipts and
retention counters. It also owns persisted CI jobs, deadlines, stage
checkpoints and terminal receipts. The creation key derivation cannot
reconstruct arbitrary committed history or CI receipts. JobRoom retains
SDK dispatch and alarm state. It drives work but does not own commit or CI
result truth. Per-runtime prepared payloads and scheduler structures are
ephemeral. The reserved admission room persists windows, live slots and
routed/creation reservations. Resetting it can invalidate app-wide bounds.

## Offline qualification

`tests/workerd-recovery.test.ts` creates real SQLite state through the
Worker APIs, waits for a failed and a passing receipt, stops the isolated
runtime before copying its entire durable persistence directory, restarts
it, then starts a fresh runtime from a separate copy with the same private
binding names, exact schema and pinned code. The test hashes ordered API
paths and exact response bytes before and after, including metadata, HEAD,
commit lineage, trees, files, both receipts and idempotency. It verifies
foreign-owner denial and replay integrity after restore. It runs only on
temporary local storage. The report records a digest and local measured
recovery time.

This same-version local snapshot covers custom tables and JobRoom persistence.
It does not establish cross-version migration compatibility, hosted snapshot
format, hosted alarm recovery after restore or production undeploy retention.

## Production runbook

1. Read authenticated metadata and record app ID, source SHA, class/migration
   manifest, canonical routes and last serving release. Freeze writes and
   scheduled work using a provider-supported verified ingress suspension
   procedure before attempting backup. Confirm how control-plane resumption
   works and preserve the current verified account bindings privately.
2. Obtain provider-confirmed backup coverage for both custom classes and the
   reserved admission room, including SQLite, alarm/dispatch policy and the
   restore identity mapping. Verify checksums, encryption, owner-principal
   continuity, retained versions and retention policy. Use an isolated
   restore and the API integrity checks above before risking production data.
3. If general backup coverage cannot be established, hold production. A future
   owner-authorized bounded export could preserve immutable records,
   idempotency, HEAD and terminal CI evidence using paged authenticated
   reads. A restore would need supported private provisioning, canonical ID
   and signature/hash validation and atomic publication. No public dump or
   direct production SQL restore is implemented.
4. Distinguish operations. Normal deployment updates executable code and may
   apply declared schema migrations. Code rollback restores an earlier
   release bundle with current secrets and cannot reverse database changes.
   Route suspension should only change ingress. Undeploy may delete the
   Worker and associated state. Resource deletion is destructive. Backup
   restoration substitutes verified durable state. Never authorize class
   deletion, schema downgrade or production restore through this runbook.
5. Obtain explicit operator approval and provider confirmation for any
   destructive or ambiguous operation. DeepSpace's guides warn that
   undeploy removes DO data while the Terms describe data retention more
   broadly. Keep that contradiction open for this production slot. No
   deploy, rollback, undeploy, data migration or delete ran in PASS 12B.

[Provider guarantees](../security/deepspace-platform-guarantees.md) ·
[DeepSpace deployment](https://docs.deep.space/concepts/deployment)
