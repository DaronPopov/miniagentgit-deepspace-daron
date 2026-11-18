# Parser isolation decision

**Hard CPU and memory isolation remains a hosted blocker.** PASS 12B
retains the fixed Babel pipeline, fingerprint, parser-input guards and
durable generation fencing. It adds global admission before owner dispatch.
That reduces the admitted rate and reachable repositories. It does not
interrupt an individual parser call or enforce process memory.

| Candidate                                              | Decision                                                                                                                                                                                            |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DeepSpace production Worker CPU and memory enforcement | Effective production quotas, configurability and interruption/recovery behavior are unverified on this slot. Direct Cloudflare limits cannot be imported as DeepSpace guarantees.                   |
| Separate Worker or dynamic isolate                     | Could limit trusted adapter execution if the provider binds and enforces independent compute and memory ceilings. No supported scoped Free binding or price guarantee was established for this app. |
| External sandbox                                       | Adds an integration and billing boundary. The documented Anthropic facility does not establish a fixed free parser budget. [Sandbox guide](https://docs.deep.space/guides/anthropic-sandbox)        |
| Separate OS process                                    | Useful for local measurement. The Worker runtime cannot launch one, and the local old-space cap is not a hard process RSS limit.                                                                    |
| Alternative parser                                     | Changes accepted syntax and CI identity. No replacement with verified compatible output and interruptible memory/CPU limits was found.                                                              |
| Additional input structure bounds                      | Can cheaply reject some inputs. Existing size, nesting/complexity and AST bounds remain. They cannot prove a hard per-call limit.                                                                   |

The existing bounded corpus runs Babel and JSON parsing as data only. The
measurement harness launches 40 fixtures × three fresh local processes,
each with a three-second parent kill timeout and 96 MiB V8 old-space
setting. A process timeout and an actual peak RSS are separate. No untrusted
source program executes. The workerd checks cover malformed source,
nesting and valid input, deadline and orphan expiry, checkpoint recreation
and stale generation rejection. No native hosted CPU or OOM kill was
induced. Exact results and measurements are in [PASS 12B results](../passes/pass12b-results.md).
[Prior parser qualification](../ci-parser-resource-qualification.md)

A future isolate must accept only bounded source text and fixed grammar flags,
return bounded normalized analysis or a terminal resource classification,
and hold no repository write capability. The parent must retain scheduling
ownership until the isolate actually settles, fail closed on interruption,
and fence stale completion before committing a receipt.
