# PASS 11B implementation notes

## Starting state and sources

The checkout started clean on `main` at
`172992a2cdc78d895cc839c8a17eb8d6c0a1aef0`. GitHub advertised the same
commit. Read the PASS 11A results and browser evidence, the PASS 11B plan,
the engineering standards, the production route tables and the installed
DeepSpace 0.44.2 session and JWT declarations. The production dashboard
initially displayed only verified account status. [SDK documentation index](https://docs.deep.space/llms.txt)
· [Client auth](https://docs.deep.space/sdk-reference/client/auth.md)
· [Worker auth](https://docs.deep.space/sdk-reference/worker/auth.md)

## Verified browser API surface

All successful repository reads use the existing `{ok:true,value}` envelope.
The browser uses the verified user's Bearer JWT and the Worker checks ownership
at the repository authority. Let `R` be `/api/repositories/:id`.

| Request                                 | Dashboard use                                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `GET /api/me`                           | Verify the SDK session subject before mounting the dashboard and before each resource request. |
| `GET R`, `GET R/head`                   | Stored repository metadata and the current commit ID or empty HEAD, with version.              |
| `GET R/commits/:commit`                 | Immutable metadata, author, timestamp, full message and parent pointer.                        |
| `GET R/tree?commit=…&limit=12&cursor=…` | Manifest page for the selected commit using the returned next cursor.                          |
| `GET R/files/:commit?path=…`            | Decoded JSON text for that exact snapshot path. Render as text in a scrollable preview.        |
| `GET R/ci/jobs?limit=4&cursor=…`        | Bounded repository job pages.                                                                  |
| `GET R/ci/jobs/:job`                    | Current persisted job state, pipeline version and result code.                                 |
| `GET R/ci/jobs/:job/receipt`            | Immutable receipt, including version-specific checks. Receipt 409 indicates pending.           |

The read adapter decodes the success envelope and distinguishes invalid, expired,
forbidden, missing, conflict, timeout, cancellation and service failure. The
receipt pane interprets its endpoint's conflict as pending. Job and receipt
outcomes use their persisted terminal codes. The app has no account-wide
repository index or paged commit-history endpoint. Parent navigation is
limited to 32 steps from current HEAD.

## Browser state and mutations

`auth-ui` retains ownership of credential acquisition, identity verification
and invalidation. It passes a same-origin GET reader into the new
`dashboard` feature only after successful identity verification. The feature
uses local React state. Resource panels key by path and refresh attempt,
abort reads on unmount, and suppress late results. The session reader scopes
both token and requests to a session generation and admits up to four
outstanding reads, with a ten-second deadline. Sign-out, expiration, mismatch
and account changes unmount and clear the protected view. The server
continues to decide access and to own all persistence.

The browser read path excludes repository creation and CI admission.
Those existing POSTs require a separately qualified mutation lifecycle,
including stable creation intent and recovery after uncertain outcomes.
Users submit them through the existing HTTP or native MCP contract and use
the returned repository ID in the browser. CI inspection offers explicit
refresh with no polling. No service, storage authority, transport contract,
security header, dependency lock or CI fingerprint changed.

## Browser qualification design

The pinned Playwright MCP runner starts the official build in local
workerd. Seeds go through authenticated HTTP requests with the existing
ephemeral identity signer. Workerd runs the normal persisted CI pipeline.
The browser pending-receipt probe replays the actual 409 returned during
that same job's execution, then refreshes against the real terminal receipt.
This controls browser timing without changing server state. See the
[browser evidence](../frontend/evidence/pass11b/README.md) for reproduction.
