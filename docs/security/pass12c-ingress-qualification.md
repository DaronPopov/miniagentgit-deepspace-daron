# PASS 12C canonical-origin ingress

**BLOCKED.** The production app stayed undeployed with zero routes. On
November 18, 2026, the installed SDK/CLI 0.44.2, authenticated metadata and
official production guidance did not establish an edge gate for direct
canonical `*.app.space` requests.

| Candidate                                     | Assessment                                                                                                                                                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Official private deployment or approved users | No canonical-host, pre-Worker restriction established. The team privacy guide is about app sign-in and record authorization.                                                                                              |
| Platform-managed access                       | Collaborator permissions cover management and source/deployment access. They do not establish a caller perimeter.                                                                                                         |
| Platform quotas or rate limits                | The SDK documents service-specific limits such as shared screenshot rendering. The binding manifest accepts a rate-limit binding. Neither establishes pre-Worker policy for all canonical traffic or billing for rejects. |
| Route suspension                              | No supported non-destructive suspension covering the canonical host and its persisted state was established. Custom-domain detach is not equivalent.                                                                      |
| App-level defense in depth                    | PASS 12B's admission ledger bounds post-entry work. Verified subject approval and canonical owner authorization remain in place. Static assets can be handled before the app gate.                                        |

Sources: [Deployment](https://docs.deep.space/concepts/deployment),
[private app guide](https://docs.deep.space/agents/make-app-private-team-only-google-sign-in),
[collaborators](https://docs.deep.space/guides/collaborators),
[Worker bindings](https://docs.deep.space/sdk-reference/worker/bindings),
and [local admission design](global-admission.md).

DeepSpace must establish a canonical edge boundary that works for approved
OAuth and MCP clients, or a provider-enforced global quota that bounds
public ingress and its costs. A custom-domain-only rule or reverse proxy
leaves the original hostname in scope. No adequate substitute was verified.

After the underlying guarantee exists and deployment is separately
authorized, check the canonical host directly with a small set of ordinary
unauthenticated and approved requests. Verify static navigation, OAuth
callback, repository API and MCP, including a concurrent request and
bounded invalid-credential probes. Confirm rejects are handled at the
documented layer and metered accordingly. No hosted bypass tests ran here.
Provider report `8934f453-b71a-4dfb-bcac-54749cab8b48` is pending.
