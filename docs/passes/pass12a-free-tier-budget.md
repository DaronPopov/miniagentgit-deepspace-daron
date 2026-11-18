# PASS 12A free-tier budget

## Verified production account and assigned app

Authenticated SDK CLI 0.44.2 reported the Free tier, 500 allocated credits,
499.9977692 remaining and 0.0022308 used. Purchased and bonus allocations
were zero. The response scopes these figures to the account and reports no
renewal date. The same figures appeared in the final snapshot after the
read-only checks. This observed delta of zero applies to the two snapshots.
It does not establish how a deployment, jobs or delayed usage are metered.

| Item                                    | Evidence and status                                                                                                                                                                                                                                 |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free app slots                          | One existing registration and no active deployment in the account list. The numeric production entitlement and revival headroom were not present in the inspected account responses. The one-slot staging documentation is for staging.             |
| Uploaded files                          | App files API reported 0 used of 1,073,741,824 bytes; the public Free guide specifies 128 MiB. Retain the lower 128 MiB planning ceiling. Both concern user/app file storage.                                                                       |
| Release and assets                      | Installed deploy help reports 25 MiB per asset. Local client files total about 468 kB including static assets. Worker JS is 1,522,527 bytes. Aggregate release and production provisioning entitlements remain unverified. No release was uploaded. |
| CPU, memory, Durable Object and SQLite  | Effective quotas, pricing and metering for this production slot were not disclosed in the inspected interfaces. Object-local application bounds exist.                                                                                              |
| Requests, build, auth and agent/CI jobs | No verified production conversion from these operations to account credits or guaranteed unmetered allowance.                                                                                                                                       |
| Spending enforcement                    | No supported hard cap or account behavior at exhaustion was established for the intended production workload. No billing settings were changed.                                                                                                     |

Sources: [CLI usage and deployment](https://docs.deep.space/cli-reference/commands),
[provider file guide](https://docs.deep.space/agents/add-file-uploads-to-a-web-app),
[staging agent guide](https://docs.deep.space/agents/start) and
[application bounds](../free-tier-budget.md).

## Workload budget and stop gate

Reserved scope for a later safe run is one release on the assigned app, one
repository, two short commits totaling under 128 source bytes, two CI jobs,
one bounded replay, one stale-HEAD probe and a second authorized identity for
isolation. Allow at most 160 application-origin requests including readiness,
two browser viewports and reconnection. Cap agent CI status observations at
five per job and pause on timeout, rate/credit refusal, unexpected resources
or a usage increase that cannot be attributed. Count CLI and provider OAuth
requests separately. No user-file upload or third-party paid operation is
needed. These are operator workload ceilings. A credit estimate is unknown
without a verified conversion, and the request ceiling cannot police third
parties.

Stopped before release upload because effective ingress and spending
protection were unverified. No app deployment, runtime job or billable
test workload was initiated. The only HTTP probe to the former app origin
returned 404. Zero account delta was observed across the metadata reads.
