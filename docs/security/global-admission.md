# App-wide admission

The production Worker entry wires admission before mounted routes. Static
landing, docs and dashboard shells/assets remain public. Static assets can
be answered before the Worker. Health and unmatched routes are cheap status
or 404 responses. The managed OAuth provider redirect, callback, session and sign-out share an auth lane. Token exchange
has a separate lane so routine dashboard reads cannot consume the balance
for callbacks or sign-out. Repository, CI, identity and
native MCP discovery/invocation share the protected lane. SDK's current
native discovery requires credentials. No internal stage RPC is exposed as
public HTTP. Canonical binding delivery and owner authorization remain intact.

## Ordering and trusted configuration

The Worker checks the bounded server-only `MINIGIT_TRUSTED_SUBJECTS` setting,
then acquires global admission before JWT verification or request body parsing.
The setting is a comma-separated list of up to 16 exact signed subjects.
Missing, empty, malformed and duplicate configurations fail closed. Production
configuration was left untouched. The local preview injects only fixture
identities with ephemeral signing keys.

After JWT verification, the HTTP or tool adapter checks the exact subject
against the list. Repository creation validates the bounded body and derives
the canonical ID before reserving it. Other calls reserve access to the
canonical ID before dispatch. The same checks apply to REST and native MCP.
Agent issuer, audience and scope remain enforced by the existing verifier.
Owner verification, persisted ownership, transactional commit semantics and
original-bearer forwarding are unchanged.

## Durable ledger and bounds

One reserved ID in the existing private RepositoryRoom namespace holds the
admission ledger. Its SQLite tables are separate from repository data. It
cannot route or execute repository or CI work. No new binding, DO class,
migration tag, external infrastructure or ownership authority was added.

| Limit                               | Value | Scope                                                                 |
| ----------------------------------- | ----: | --------------------------------------------------------------------- |
| Managed-auth starts                 |    32 | Shared aligned UTC minute                                             |
| Token exchange starts               |   192 | Separate aligned UTC minute for the read-heavy session client         |
| Protected starts                    |   256 | Shared aligned UTC minute, including invalid JWT attempts             |
| Protected Worker handlers in flight |    16 | Private durable slots, released only when the handler unwinds         |
| CI submission attempts              |    12 | Shared aligned UTC minute across HTTP and tools                       |
| Distinct routed repository IDs      |    16 | Persistent, including missing/foreign lookups after trusted admission |
| Distinct creation reservations      |     4 | Persistent, shared among approved identities, keyed by derived ID     |

Private binding requests validate the operation path and use fixed responses.
SQLite closures serialize admission. A backwards clock sample cannot refill a
bucket, and adjacent windows may permit two bursts near a boundary. Retrying
the same canonical ID retains its slot. Request or CI quota may still defer
a replay. Reserved IDs count even if dispatch fails or the lookup misses.
This conservative accounting prevents repeated new IDs from allocating
unbounded owners. Protected rejection returns a bounded 429 result, and a
missing policy or unavailable ledger fails closed.

A lost release retains its slot across restart. No timeout or startup reset
recycles a slot while its execution might still be live. No online reset or
public admin route exists. Controlled recovery requires confirming all
writers and outstanding handlers are stopped before deciding how to restore
capacity. If the ledger is saturated, fail closed. A stale release for an
unrelated ID cannot free another slot.

The protected slot lifetime covers the HTTP handler. CI alarms can continue
after the response. The global submission lane and finite route set bound
new reachable work. Existing per-owner caps limit four outstanding and 32
retained CI jobs, 512 KiB logical CI accounting, and 8 MiB repository logical
retention. A fresh ledger can reserve four new repos. Across 16 retained
routes the per-room upper envelope is 128 MiB repository and 8 MiB CI logical
accounting. This does not count preexisting unreachable rooms or establish
physical SQLite limits. Per-identity quotas and fairness are deferred.
An admitted identity can exhaust a shared quota. Auth callback availability
also depends on upstream protection.

These controls cannot bound edge requests, billable rejects, the provider
queue before the admission object, static traffic or physical storage and
CPU. A production perimeter and cost contract remain required.
