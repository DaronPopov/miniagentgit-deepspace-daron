# Durable CI stages

PASS 09B expands the production pipeline to version 3 and receipt schema 2.
The current validator policy is in [deterministic code analysis](ci-code-analysis.md).
The PASS 09A descriptions below record the version 2 baseline.

## PASS 09B checkpoint and continuation

The repository validates every nonterminal checkpoint against its schema,
stage ordinal, job fingerprint, generation, completed-check set, counter bounds
and serialized size before continuing. Only successful stages can checkpoint
and continue, so their diagnostics must be empty. An owner redispatch validates
and atomically rebinds the checkpoint to its next generation. A malformed
checkpoint yields a failing receipt. A concurrent result must still match the
active generation and its original ordinal at commit time.

Version 3 allows four continuations per scheduler row, each delayed by 100 ms.
The SDK increments its attempts on every invocation; the app uses that count
to cap continuations and still sets SDK failure attempts to one. The stage
window and overall deadline stay at two and 30 seconds, respectively. The
repository deadline alarm settles an orphaned job without owner polling once
armed. Redispatch remains an authorized, bounded action. A failure before
arming that alarm can still require owner observation or replay.

## PASS 09A baseline

An owner requests CI for an immutable commit through the existing commit CI
route. With the app-private JobRoom binding present, new admissions select
pipeline version 2, using the existing pipeline ID and receipt schema. The
repository transaction inserts the CI identity and its initial stage row
together. The same authorized POST is the bounded redispatch action. Status,
list, receipt and cancellation retain their existing access model.

## Authority and lifecycle

RepositoryRoom owns all admission, cursor, deadline, accounting and terminal
receipt state. AppJobRoom is scoped by the CI job ID within the app namespace.
Its only enqueue path accepts one type, a fixed five-field dispatch and one SDK
attempt. Its fetch override rejects WebSockets. The public Worker has no job
route. The repository execution method is Durable Object RPC accessible through
the typed app-private binding. The public Worker forwards HTTP fetches only.
JobRoom checks the app binding configuration, and RepositoryRoom checks the
canonical object ID, exact job, repository, commit, pipeline fingerprint and
active generation. Owner and tool auth continue through their existing routes.
No user token travels through JobRoom.

Stage sequence zero selects integrity. A successful integrity invocation saves
its accounting and sequence one inside SQLite, then JobRoom asks for another
alarm. Sequence one selects source policy. A validation failure, or completed
source policy, commits sequence two and the immutable receipt in the same
transaction. A cancellation, expiry or interruption can terminate at either
cursor. The terminal job row then prevents any cursor advancement. A completion
also fences on the sequence it read. An in-flight stale result cannot duplicate
diagnostics, charge work to the canonical receipt, or advance HEAD.

Migration 4 adds `ci_stages`, keyed by the CI job. The joined job row provides
the fingerprint, execution generation, attempts, deadline and terminal state.
The stage row holds the sequence, bounded aggregate validation JSON and timing
fields. The database caps serialized validation at 4 KiB. Both stages read
bounded committed snapshots from the repository, and the checkpoint and
dispatch carry no source text. Per-stage input is limited by the existing
snapshot bounds. Source starts with the logical work already charged to
integrity.

## Installed SDK 0.44.2

- `JobRoom<E, P, R>(state, env, config?: JobRoomConfig)` calls
  `onJob(job, ctx)` inside its alarm for this configuration.
- `enqueueJob(namespace, roomId, type, payload?, options?): Promise<string>`
  uses binding stub fetch and returns the SDK job UUID. The repository authority
  does not require this UUID to advance a stage.
- `ctx.continue(state: unknown, options?: { afterMs?: number }): void` puts the
  SDK row back in the queue after the handler returns. `Job.resumeFrom?: unknown`
  holds the continuation hint. The repository cursor selects the stage on every
  invocation, including when the hint is absent or disagrees.
- `ctx.progress(value: number, message?: string): void` is available. Public
  status continues to come from the repository. `ctx.signal: AbortSignal` is
  checked before dispatch and before scheduling continuation.
- SDK attempts increment on each invocation, including successful continuations.
  The max-attempt check governs failure and interrupted-run recovery. With one
  attempt, the SDK may fail an interrupted running row on recreation. SQLite
  remains the authority and an owner can redispatch within the repository budget.
- SDK socket cancellation updates its own row and signals same-isolate work.
  Repository cancellation commits independently. It fences results even during a
  synchronous validator that JavaScript cannot preempt. The SDK terminal TTL
  defaults to 24 hours. Pruning runs on SDK alarms, so inactive per-job rooms
  can retain their bounded scheduler rows past that TTL.

The installed CLI help and SDK declarations and runtime were checked locally.
The public references describe the intended interfaces. [Background jobs](https://docs.deep.space/guides/background-jobs),
[Scheduled jobs](https://docs.deep.space/guides/scheduled-jobs),
[Rooms reference](https://docs.deep.space/sdk-reference/worker/rooms).

## Dispatch, recovery and limits

The pending CI job and stage row serve as the durable intent. A transaction
reserves a generation and increments the dispatch count before enqueue. A replay
after a three-second lease can reserve generation two, preserving the stage
cursor. This also covers an ambiguous enqueue acknowledgment. A late alarm
from the older generation cannot advance the job. After two reservations,
uncertain work can still settle until its deadline. The next eligible deadline
check expires a stalled job. No automatic redispatch loop runs.

The 30-second overall deadline begins at admission and leaves room for alarm
delays. A repository-local one-shot deadline alarm expires outstanding staged
jobs, then arms only the next pending deadline. Owner observation and stage
execution also enforce expiry. A crash between admission/reservation and alarm
arming can leave recovery dependent on an authorized request. A stage has a
2-second execution window, a local abort timer, and a persisted deadline check
at completion. Fixed validators run at most two stages. One 100 ms SDK
continuation is allowed per scheduler row. CronRoom stays idle. JobRoom alarms
schedule commit-triggered stages, and the repository alarm only settles overdue
repository work.

The original file, input, work, diagnostic, receipt, outstanding and retained
job ceilings still apply. Version 2 reserves up to 4 KiB of the existing retained
storage budget per job. Reading the snapshot twice and repeating uncommitted work
can increase real CPU, reads and allocation. Logical work is a receipt measure.
Many repositories still share the same account allocation and have no
application-wide ingress or repository budget in this pass.

## Compatibility and future stages

Version 2 deliberately fingerprints its execution and validator source. Historical
version 1 terminal receipts and identifiers are preserved. The existing executor
can drain supported legacy work and interrupts unsupported queued or recovered
work under its existing fencing policy. The updated executable fingerprint means
pre-pass pending v1 fingerprints become unavailable. Unsupported staged work
also fails closed. A local environment without the JobRoom binding uses the
existing synchronous-validation fallback with its current fingerprint.

Only integrity and source policy execute. The receipt still reports TypeScript
as deferred. Future stages can take a fenced dispatch, bounded immutable
`CiSnapshot` and typed prior state, then return a fixed validation outcome through
the same checkpoint transaction. A future change needs an explicit cursor,
pipeline identity, accounting and local qualification for each executable stage.
Syntax would parse bounded JS, TS or JSON. Lint would use fixed rules without
plugins or repository configuration. Imports would resolve relative paths inside
the snapshot. Semantic type analysis requires separate Worker bundle, CPU and
memory qualification. No submitted program is executed.

## PASS 09C stage containment

The two-second elapsed check can reject a finished stage. JavaScript timers
cannot interrupt a synchronous parser. Local workerd verified checkpoint
resumption and orphan expiry. See the
[parser resource qualification](ci-parser-resource-qualification.md) for the
limits on that evidence.
