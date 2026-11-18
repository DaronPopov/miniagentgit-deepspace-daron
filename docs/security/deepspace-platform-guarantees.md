# DeepSpace production guarantees assessment

Reviewed November 18, 2026 on the production plane with SDK and CLI 0.44.2.
Sources are official contracts, installed help/types and authenticated
read-only metadata. The assigned app was undeployed throughout.

| Claim                                                                  | Status        | Evidence                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Assigned app identity and GitHub source                                | OBSERVED      | Production `deepspace status --json` reported the assigned ID, GitHub source, historical release sequence 1 and `serving: false`.                                                                                                                                                                                                                     |
| Canonical host publication                                             | VERIFIED      | The deployment guide defines the canonical HTTPS app origin. [Deployment](https://docs.deep.space/concepts/deployment)                                                                                                                                                                                                                                |
| Private deployment, trusted audience at edge and origin restriction    | UNVERIFIED    | No app-specific feature surfaced in reviewed production CLI and account metadata. Documentation on app sign-in/data access and domain attachment does not establish a canonical edge perimeter. [CLI commands](https://docs.deep.space/cli-reference/commands)                                                                                        |
| Pre-Worker rate limit, request quotas and app-wide resource budget     | UNVERIFIED    | No production contract establishing such app-specific protection, including rejected-request accounting, was found. Local Worker quotas begin after ingress.                                                                                                                                                                                          |
| Traffic suspension or route disable preserving storage                 | UNVERIFIED    | Domain detach and undeploy are documented commands. Neither establishes safe suspension of every canonical route while retaining custom Durable Objects.                                                                                                                                                                                              |
| Current Free allocation/consumption                                    | OBSERVED      | Same account summary at both checkpoints. 500 allocated, 0.0022308 used, 499.9977692 remaining. [CLI app usage](https://docs.deep.space/cli-reference/commands#app-usage)                                                                                                                                                                             |
| Free exhaustion, payment method, hard cap, usage update latency        | UNVERIFIED    | Account usage is a balance snapshot. No guaranteed exhaustion or overage behavior was established for this slot.                                                                                                                                                                                                                                      |
| Runtime/build/deploy/auth/storage/CI charging                          | UNVERIFIED    | No confirmed per-operation accounting or delayed-charge bounds for the requested workload.                                                                                                                                                                                                                                                            |
| Worker CPU/RSS, DO execution/SQLite, queue/concurrency and termination | UNVERIFIED    | Upstream Cloudflare documents capabilities. Effective limits and configurability under DeepSpace's production dispatch are unverified. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) · [DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/)                                                 |
| SDK request/body limits and job lifecycle                              | VERIFIED      | Installed SDK and app source implement bounded decode and job delivery/handling contracts. These are application/SDK contracts. Provider ingress/body, execution and queue ceilings remain unknown. [Background jobs](https://docs.deep.space/guides/background-jobs)                                                                                 |
| Normal redeploy vs undeploy                                            | CONTRADICTORY | Deployment and app identity guides warn Worker undeploy removes DO data. Terms describe retention more broadly. Preserve this disagreement pending scoped provider confirmation. [Deployment](https://docs.deep.space/concepts/deployment#undeploy) · [App identity](https://docs.deep.space/guides/app-identity) · [Terms](https://deep.space/terms) |
| Backup/restore of custom RepositoryRoom and JobRoom                    | UNVERIFIED    | Provider material mentions app backups but does not establish export, restore and scope for these custom SQLite classes and alarm state. [Maintenance guide](https://docs.deep.space/agents/website-maintenance-checklist-uptime-backups-ssl-updates)                                                                                                 |

Staging agent enrollment and supported staging request limits are excluded as
production evidence. Direct Cloudflare billing and resource limits are
upstream references.

## Provider escalation draft

Prepared for the supported `deepspace feedback` channel. No message was sent.

> For our existing production Free app, what supported restriction protects
> its canonical app.space origin before Worker execution, including direct
> requests and approved browser/MCP users? What is the enforced Free-credit
> exhaustion behavior, can a payment method incur overages, and which rejected
> requests, compute, auth, storage, deployments and jobs are metered? How long
> can usage reporting lag? What are the actual Worker, Durable Object SQLite,
> queue and job resource ceilings? Does undeploy retain custom Durable Object
> data on this app, and how can we disable all ingress without deletion? What
> supported backup and restore procedure covers custom SQLite classes, identities
> and alarms, and how can we verify restoration in isolation?

## PASS 12C escalation

The PASS 12B draft above was expanded to cover rejection billing, maximum
usage reporting delay, independent parser budgets and post-restore alarms.
On November 18, 2026 at 14:12:44 UTC, DeepSpace accepted it as report
`8934f453-b71a-4dfb-bcac-54749cab8b48` with status `open`. The receipt
contained no provider answer.

The official CLI command reference and installed 0.44.2 implementation
identify an authenticated POST to the production API worker's
`/api/feedback` endpoint. The confirmed destination was
`https://api-worker.deep.space`. The command ran outside the repository
to omit automatic app-name context. It sent the public app ID, sanitized
questions and standard CLI/runtime metadata. The authenticated receipt
included private account fields, which are excluded from Git. CLI help
exposes submission. Supported triage tracking is through the dashboard.
No duplicate request or undocumented polling ran.
[Feedback documentation](https://docs.deep.space/cli-reference/commands#feedback)
· [DeepSpace dashboard](https://dashboard.deep.space/)
