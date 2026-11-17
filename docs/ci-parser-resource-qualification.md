# Parser resource qualification

PASS 09C retains the PASS 09B production pipeline and Babel version. The
available local runtime did not establish a hard CPU or memory boundary for a
single synchronous parser call. The qualification adds a reproducible
adversarial corpus, a process-isolated measurement harness, and durable failure
tests. It provides local evidence for the existing bounds and identifies
where those bounds take effect.

## Threat and limits

Adversarial committed text can induce recursive grammar calls, JSX and
TypeScript speculative parsing, token density, deep trees, and large numbers
of allocations. The installed Babel implementation enters recursive expression
and type grammar and can clone and retry parser state when JSX and TypeScript
alternatives overlap. Its public options used here expose no execution budget
or abort signal. The Worker selects fixed plugins from file extensions and
passes source as data. Repository configuration, source code, packages and
user plugins have no execution role in this path.

| Boundary             | What is enforced                                                                                                                                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Before parsing       | Up to 32 files, 32 KiB per file and 128 KiB per snapshot. Integrity verifies byte sizes. Source policy checks text and physical line count. Every analysis stage checks its input-byte allowance, existing logical budget and the signal before starting a file.        |
| Inside a parser call | Fixed grammar options and the input size ceiling apply. Babel can allocate AST nodes and recurse before returning. The application has no token, allocation, stack or CPU interrupt inside the call. Native JSON parsing also runs synchronously.                       |
| After parsing        | Only normalized error categories reach receipts. Syntax errors become fixed diagnostics. A catchable RangeError is mapped to `work_limit` and an unexpected exception to `validator_exception`.                                                                         |
| AST traversal        | At most 8,192 counted nodes per file, 24,576 per stage and depth 128. Typed nodes are visited in parser property and array order. `loc` and `extra` are excluded. Import fanout is capped at 64 per file and 256 per stage.                                             |
| Across stages        | The 512 KiB logical work budget, two-second elapsed-stage settlement check and 30-second durable deadline apply. Cancellation, generation and ordinal are fenced before checkpointing. These are distinct from physical CPU and memory budgets.                         |
| Runtime boundary     | Cloudflare documents per-invocation CPU enforcement and an isolate-level memory limit. Neither supplies an application-level parser interrupt or a guaranteed failing CI receipt. The exact DeepSpace hosted configuration and termination behavior remain unqualified. |

The traversal is intentionally recursive at a fixed depth. Tests verify it
visits import and lint nodes in order, skips the selected metadata, and stops
even on a synthetic typed-child cycle. `Object.entries` allocates key/value
pairs for each visited node, but it makes no list of the full AST and the tests
gave no evidence that changing traversal would repair parser allocation. A
workerd run accepted 24,004 bytes of dense JavaScript as parser input, assembled
the AST, and then rejected it at the traversal limit. Node separately parsed
the same input successfully. This demonstrates the allocation gap.

## Preflight decision

A proposed cap of 250 raw opening parentheses would catch two of the recursion
fixtures. It would also reject a valid 32 KiB string literal containing more
than 32,000 opening parentheses and the 500-level parenthesized expression
accepted by local workerd. A UTF-16 limit below the existing byte limit would
reject sparse, valid ASCII sources that parsed cheaply. A length or punctuation
cap also cannot distinguish AST density or grammar backtracking. In the corpus,
a small nested mixed expression raised a stack exception in Node and a much
larger sparse TypeScript input passed.

A lexical preflight detailed enough to understand JavaScript regex literals,
templates, JSX and TypeScript ambiguities would expand the trusted grammar
surface. The available evidence supports keeping the existing input ceilings.
No new pre-parse rejection rule is enabled. The corpus is regression evidence,
and does not rule out a slower input outside the sampled cases. A separately
isolated analysis tier with independently enforceable CPU and memory budgets
would be the next boundary to qualify before claiming a hard execution limit.

## Cancellation and recovery

A synchronous callback cannot run its timer or receive an event-loop abort
while blocked in parsing. The local workerd probe observed the timeout signal
as false immediately after bounded synchronous work and true after yielding.
The stage's elapsed clock and durable job fence can reject an over-budget or
cancelled result after control returns. Injected clock, cancellation and
generation changes just after parsing prove the repository fence. They do not
model a concurrent JavaScript callback inside Babel.

The local Miniflare invocation accepted a requested 1 ms CPU setting on a test
probe and returned HTTP 200 twice despite host-observed warm latency of about
33 ms. No native limit termination was reproduced. Host latency does not
measure CPU time, and the probe does not establish that the setting was
enforced by open-source workerd. Cloudflare's published Worker and Durable
Object limits describe hosted enforcement. Memory pressure is isolate-wide.
Neither local peak-isolate memory nor native termination and subsequent
isolate restart was measured. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) ·
[Durable Object limits](https://developers.cloudflare.com/durable-objects/platform/limits/)

The JobRoom alarm dispatches one stage per invocation. A continuation can
only be stored after the synchronous work and repository transition return.
The next eligible execution reads the verified SQLite checkpoint, with old
generations and duplicate completions fenced. Workerd recreation at four
checkpoint boundaries resumed correctly. A deliberately orphaned invocation
expired through the repository's pre-armed deadline alarm without HTTP
polling. Graceful local recreation and an injected orphan do not prove
recovery from a hosted isolate kill. Cloudflare documents at-least-once
alarm delivery and bounded retries, distinct from the repository's bounded
redispatch policy. [Durable Object alarms](https://developers.cloudflare.com/durable-objects/api/alarms/)

## Reproduction

The corpus uses deterministic string generators and stays inside the existing
per-file byte ceiling. The isolated Node harness starts a fresh process per
sample, applies a 96 MiB old-generation setting and a three-second parent
timeout with forced termination, and continues after failures. The old-space
setting is separate from total process RSS. The process sends only timing,
memory, token counts and outcome categories. No submitted fixture code is
executed. A second Babel parse collects token counts after the timed sample.

```sh
node scripts/parser-qualification/measure.mjs
CI_VERIFY_PARSER_CORPUS=1 npx vitest run --maxWorkers=1 tests/ci-parser-corpus-workerd.test.ts tests/ci-parser-aggregate-workerd.test.ts tests/ci-parser-runtime-workerd.test.ts
```

On PowerShell, run the same Node command. Set
`$env:CI_VERIFY_PARSER_CORPUS = '1'` before running the Vitest command, then
remove it with `Remove-Item Env:CI_VERIFY_PARSER_CORPUS`.

[Results and measurement matrix](passes/pass09c-results.md)
