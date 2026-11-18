# PASS 12A deployment and recovery

The production management session read the assigned application
`app_01M7N6X263TDDC26Y59Q1RK23P`. The source authority is
GitHub `DaronPopov/miniagentgit-deepspace-daron`. The platform listed the app
as undeployed, with zero routes. Release sequence 1 from November 17, 2026
is historical. It is marked dirty and has no Git commit OID. Its release ID
is `rel_01M7N72AKFS80MH2K7PRXMWR62`. The platform reports a rollback bundle
for it. No active application data plane was available to inspect. An empty
file listing does not establish Durable Object contents.

The former origin `https://miniagentgit-deepspace-daron.app.space/` returned
404 over HTTPS with TLS verification successful. No release was uploaded
and no deployed SHA, release identifier or deployment time was produced
by PASS 12A. The final status still reports `serving: false`, release sequence 1.

## Recovery boundary

Once the exposure gate is met, the supported path is a clean, validated
checkout of GitHub `main`, the assigned ID and the pinned
`deepspace deploy --no-push --json` command. Verify the resolved target
and source status first, record the returned release and verify that
the release stamp and API identify the new data plane. Keep the candidate's
existing migration tags and classes. No destructive schema migration was
requested or applied in this pass.

Installed CLI help documents `deepspace releases` and `deepspace rollback`
for selecting a prior bundle with current live secrets. The historic bundle
is not a verified recovery target. Compare manifests before proposing a
rollback. Never use the class-deletion override as part of routine recovery.
A code rollback provides no database rollback.

The [deployment guide](https://docs.deep.space/concepts/deployment#undeploy)
and [app identity guide](https://docs.deep.space/guides/app-identity)
warn that deleting the deployed Worker through undeploy removes Durable
Object data. The [Terms of Service](https://deep.space/terms) describe
data retention on undeploy more broadly. Resolve the difference for this
specific production slot with DeepSpace and establish a safe backup or
ingress-disable procedure before relying on undeploy. Neither rollback nor
undeploy was invoked.
