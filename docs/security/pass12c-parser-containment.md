# PASS 12C parser containment

**BLOCKED.** A hard CPU and memory boundary for the existing synchronous
parser was not established on this production Free slot. The current
pipeline, fingerprint and Durable Object identities are unchanged.

## Installed deployment path

Inspected SDK/CLI 0.44.2 `ALLOWED_BINDING_TYPES`,
`bindingManifestFromOutputConfig` and the CLI's production deploy assembly.
An offline SDK call with only `worker_loaders`, a separate `services`
binding and `limits.cpu_ms` returned an empty custom binding manifest.
The deploy assembly supplies a validated custom binding manifest and
separate Durable Object declarations. It did not establish a supported
parser loader, private parser service or independently enforced limits
for this slot. This is a local packaging observation, not a production
capability test.

Direct Cloudflare Dynamic Workers are documented for paid Workers users.
A published upstream API does not establish access or cost under DeepSpace
Free. DeepSpace's documented Anthropic sandbox adds an external metering and
execution model, without the required verified free, hard-budget parser-only
contract. Another Durable Object or a JavaScript timeout cannot establish
independent hard containment. The Worker runtime also provides no supported
Node child-process adapter for this deployment.

[DeepSpace deployment](https://docs.deep.space/concepts/deployment)
· [Binding manifest](https://docs.deep.space/sdk-reference/worker/bindings)
· [Cloudflare Dynamic Workers](https://developers.cloudflare.com/changelog/post/2026-03-24-dynamic-workers-open-beta/)
· [DeepSpace sandbox](https://docs.deep.space/guides/anthropic-sandbox)

## Qualified local evidence

The existing parser corpus ran 40 fixtures in three isolated Node samples
each. Observed maxima were 19.66 ms wall, 39.67 ms CPU and 76,764 KiB process
peak RSS. The harness enforces a parent-process timeout and a V8 old-space
setting. These are local process controls, and RSS includes the rest of the
process. No sample required forced termination. Workerd stage tests and
regressions cover malformed/complex input, cancellation fencing, restart
and expiry of an injected orphan. These do not qualify a hosted CPU or OOM
termination of a live parser invocation.

The smallest compatible alternative is a provider-supported private,
parser-only execution boundary with independently enforced CPU/memory and
bounded failure reporting. The existing JobRoom/RepositoryRoom authority
would retain admission and generation fencing. The isolated adapter would
receive bounded immutable text and fixed grammar configuration, return
normalized bounded output and hold no auth secrets or repository authority.
Provider cost, cancellation, transaction/alarms behavior and termination
recovery still need qualification. A materially different parser would
need acceptance and intentional versioned semantic migration. No alternate
platform, dependency or production resource was introduced.
[Existing parser evidence](../ci-parser-resource-qualification.md)
