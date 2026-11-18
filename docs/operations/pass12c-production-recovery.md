# PASS 12C production recovery

**BLOCKED.** The assigned app was undeployed throughout. Production support
for non-destructive canonical suspension and custom SQLite backup/restore,
including alarms, remains unverified. No undeploy, rollback or production data
operation ran.

The checked-in manifest retains the seven existing SQLite classes and the
`v1` and `v2-repository-authority` migration tags. RepositoryRoom owns
immutable snapshots, HEAD, ownership, idempotency and CI outcome state.
AppJobRoom drives scheduled execution. The reserved admission partition
lives in the existing RepositoryRoom namespace and holds quotas and active
slots. It must be included in restore. The deployment guide distinguishes
ordinary redeploy from undeploy, warning of Durable Object deletion on
the latter. The Terms describe retention more broadly. Preserve the
contradiction and obtain an answer for this app. [Deployment](https://docs.deep.space/concepts/deployment)
· [Terms](https://deep.space/terms)

## Operator procedure after provider confirmation

1. **Stop traffic.** Use the provider-approved canonical suspension. Verify
   the direct origin and any attached hosts, then quiesce writes and
   scheduled dispatch. Do not equate an app-level denial with removal of
   billable edge ingress. Stop here if the approved suspension is unavailable.
2. **Back up.** Use the production-supported method covering RepositoryRoom,
   AppJobRoom, the admission partition and the handling of alarms or
   in-flight work. Record the app identity, exact classes, migration history,
   source SHA and backup integrity metadata. Protect backup data and
   principals with supported private storage. Generic app exports or uploaded
   file listings alone do not establish coverage.
3. **Restore and validate in isolation.** Restore into an approved compatible
   namespace using the confirmed identity mapping. Verify ownership, HEAD,
   parent relationships, trees and exact file bytes, historical and current
   receipts, idempotency and preserved admission capacity. Exercise foreign
   tenant denial and verify stale generations and alarm recovery before
   considering any restoration on live storage.
4. **Escalate failure.** Keep the supported perimeter closed, preserve the
   snapshot and contact DeepSpace. Obtain separate authorization for a
   restore or code rollback. Avoid class deletion, undeploy or direct
   production SQLite writes while coverage and effects are uncertain.

The local workerd snapshot and fresh restore rerun matched the exact
12-response digest
`68ea746712e64db51a4d8adee410aefa330a3d2f476c0b3dbaff34433de25eb1`
and passed foreign-owner denial and replay after restore. This is
same-version isolated state evidence, with no inference about hosted
backup, live alarm recovery or undeploy retention. A bounded private
export is a fallback design only. It cannot stop canonical ingress or
restore a production identity without a supported provisioning path.
[Local runbook](deployment-recovery.md)
