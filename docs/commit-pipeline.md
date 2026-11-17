# Bounded commit scheduling foundation

## Scope and owner

The implementation schedules lightweight commit descriptors; it does not execute
repository commits, authorize requests, store file contents, or advance HEAD.
`createCommitScheduler` receives a validated repository ID and injected executor.
Its returned frozen handle owns one FIFO, one bounded ownership map, one active
execution claim, timers, and one diagnostic ring. It is not a global registry.

The future RepositoryRoom lifecycle must instantiate exactly one scheduler for
its canonical repository and retain it as instance state. Do not instantiate one
per HTTP request or let clients select a different owner. This pass deliberately
does not attach an executor to RepositoryRoom: there is no real transaction
executor to attach yet. Production activation and hosted lifecycle verification
remain Pass 04 work; multiple factory calls are not a uniqueness mechanism.

DeepSpace 0.44.2 exports a DO manifest for the custom SQLite lifecycle prepared
in Pass 02. The installed Cloudflare declarations expose blockConcurrencyWhile,
waitUntil, abort, and transactionSync; none is assumed to make an in-memory
promise durable or a JavaScript cancellation interrupt SQL. Official
[DeepSpace architecture](https://docs.deep.space/concepts/architecture) and
[room reference](https://docs.deep.space/sdk-reference/worker/rooms) were reviewed.
No new runtime-specific integration, room fetch, registration, or deploy ran.

## Admission and FIFO

`src/domain/bounded-ring.ts` preallocates fixed slots and explicitly owns head,
tail, and occupancy. Full enqueue returns `full`; empty dequeue returns `empty`.
Modulo indices wrap; admission never overwrites accepted work. Dequeue clears
references. Identity removal shifts the bounded live suffix to free cancelled
slots immediately, preserving FIFO without accumulating tombstones. Snapshots
are detached frozen arrays; generic values remain owned by their callers.

Scheduler capacity defaults to 8, configurable from 1 to 32 **including active
work**. Admission checks the ownership map before allocating a completion
promise, controller or timer. A full scheduler returns typed QUOTA_EXCEEDED,
without a waiting-for-space promise. Closed, malformed/wrong-owner, or duplicate
pending request IDs are explicitly rejected. No unbounded producer waiting list.

One microtask is scheduled for draining; additional admissions coalesce into it.
The drain starts one request, awaits only its executor, and continues from its
settlement. Different instances share no mutable state and can progress
independently. Calls made concurrently by agents are ordered by synchronous
JavaScript admission order, not a promised order of network arrival.

Descriptors contain only validated repository/request IDs, actor subject,
expected HEAD, idempotency key, and a 64-hex prepared-content reference. They are
copied into frozen records. Extra fields, file contents, error messages, tokens,
and caller objects are not retained. Actor subject is identity, not an ownership
grant; a future authenticated adapter and executor must authorize it.

Prepared content is not stored by this scheduler. Pass 04 must give its resolver
an equally bounded lifecycle and retain/release that content according to actual
executor completion. Resolve the reference and cross-check the validated payload
against descriptor actor, repository, expected HEAD, idempotency key and digest. A hash reference does not prove content exists or is durable.

## Completion, cancellation, deadlines, and shutdown

Each accepted request has one completion promise and cancel handle. Expected
executor outcomes are committed metadata ID or conflict HEAD; thrown/rejected or
invalid executor results become sanitized failed outcomes. The scheduler does
not invent a successful commit or interpret executor tests as durable evidence.

- Queued cancellation removes its slot, clears its timer, releases ownership,
  and resolves cancelled/not-started. Surviving requests retain FIFO order.
- Active cancellation signals AbortController and resolves cancelled/unknown.
  It cannot promise rollback. The active claim stays until executor settlement;
  only then may another request start. The original deadline remains armed.
- Deadline is measured from admission, including queue time. Default 5 seconds,
  configurable 1–30,000 ms. Timer callbacks and monotonic clock checks before
  dispatch and after execution prevent stale work starting or late completion
  being reported as timely success when a callback was delayed.
- Active deadline expiry resolves failed/deadline/unknown, closes admission and
  cancels queued work. An executor ignoring abort remains the sole active claim;
  it is never raced with a replacement executor. A cancelled active request
  still occupying execution at its original deadline also closes admission.
- Shutdown closes admission, settles all public completions and cancels queued
  work immediately. It reports `quiescent: false` until an active executor really
  settles. Calling shutdown again reports actual current quiescence.

Guarantees assume a live, responsive event loop and trusted clock dependencies:
`now` is finite/monotonic; `arm` is asynchronous, fires once and returns an
idempotent, nonthrowing cleanup. Standard timer callbacks must eventually run.
No deadline can preempt a blocking synchronous transaction or code that blocks
the event loop. Worker clock resolution and CPU termination are platform limits,
not scheduler guarantees. The scheduler owns no lock or SQL transaction while
waiting. Its active claim is serialization ownership, not a held database lock.

A noncooperative executor can retain one bounded claim/promise internally until
it settles or the runtime dies. Public callers still settle by cancellation or
deadline under the model above; there is no claim of forced cleanup/quiescence.
No reopening/replacement is safe until confirmed settlement and durable recovery.

## Recent diagnostics

`src/domain/event-ring.ts` is distinct from the admission queue. Default 64,
maximum 256 events; oldest eviction is intentional. Flat discriminated events
cover admitted, started, committed, conflict, rejected, cancelled and failed.
They retain only bounded IDs and enum/commit-ID outcomes, no raw exception text,
source, auth token, actor credentials or idempotency keys. Invalid descriptor
admissions are not logged because their identifiers are untrusted.

Snapshots and entries are frozen, detached, ordered by safe-integer sequence.
Sequence MAX_SAFE_INTEGER can be written once; further appends explicitly return
sequence-exhausted without eviction/reset. Scheduler inspect exposes the exhausted
flag. Diagnostics may stop while work continues: telemetry cannot grant or revoke
commit authority. Eviction/exhaustion never removes requests or settles callers.
This is best-effort process-local visibility, not durable audit/history.
After active cancellation, a late executor outcome is intentionally not rewritten
as a second public terminal outcome; reconcile uncertain results in persistence.

## Restart, conflicts, and idempotency

Worker restart/eviction loses rings, timers, promises, and diagnostic sequences.
Acceptance here is **ephemeral scheduling acceptance**, not durable job receipt.
A disconnected client may not learn whether the executor committed. No waitUntil,
background broker, polling service, alarm or external job queue is added.

FIFO does not prove expected-HEAD correctness. Pass 04 must reauthorize against
stored metadata; check `(repository, actor, idempotency key)` and canonical
request digest before stale-HEAD rejection; atomically compare expected HEAD,
insert immutable commit/manifest/retry metadata, enforce durable quotas, and
advance HEAD in one owner SQLite transaction. A replay with matching digest
returns its prior outcome; different digest conflicts. Pending request-ID
deduplication in this pass ends on execution settlement; it cannot deduplicate
completed or restarted durable work. Never substitute the event sequence for a
commit ID, replay record or HEAD version. No SQL/R2 atomicity is claimed.

## Reference study

- [A: Ferrite RingBuffer](https://github.com/DaronPopov/ferrite-llm/blob/e6a8b9eac44edaf0f841778aee6ab5e235ed54a8/ferrite-gpu-lang/src/pipeline/ring.rs):
  adopted fixed slots, explicit head/tail/count, modulo wrap, full rejection,
  explicit dequeue and deterministic wrap tests. Its separate SharedRing uses
  oldest eviction; that policy belongs only in diagnostics here. Rejected Rust
  Mutex/VecDeque and thread synchronization; no handwritten lock emulation.
- [B: Ferrite OS IPC pipeline](https://github.com/DaronPopov/ferrite-llm/blob/e6a8b9eac44edaf0f841778aee6ab5e235ed54a8/ferrite-os/crates/public/ferrite-apps/src/bin/ipc_ring_pipeline.rs):
  adopted producer admission versus consumer draining, bounded backlog, ordered
  progress visibility and explicit capacity. It alternates producer/consumer
  phases with shared-memory metadata; it is not evidence of a web multi-writer
  transaction protocol. Rejected GPU synchronization, unsafe copies, shared
  memory, polling and 20 ms sleeps; promise settlement drives draining here.
- [C: feRcuda allocation event ring](https://github.com/DaronPopov/feRcuda_runtime/blob/f42df397e061eab56120483001652b0e82016849/native/ptx_core/include/gpu/gpu_hot_runtime.h):
  the pinned header declares a 256-event allocation array, modular write head,
  total count and compact owner/allocation metadata. Adopted bounded, compact
  diagnostics separately from execution authority. The header alone does not
  prove writer implementation or concurrency guarantees. Rejected pointers,
  GPU allocation details, uint32 counter wrap and device-memory assumptions;
  TypeScript sequences stop explicitly at safe-integer exhaustion.

Tests exercise real local ring/scheduler code with controlled executors and
clocks. They prove scheduling/retention/cancellation behavior only. The existing
local SQLite DDL tests do not establish durable commit atomicity either.
