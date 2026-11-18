# PASS 12E results

**BLOCKED before publication.** No hosted test was attempted.

Starting local and remote `main`:
`88601b0de7ae0c1538c37a862fc50918470dc1c6`. The PASS 12E documentation
commit containing this report is the final revision. The validated
application source is identical to the starting revision.

## Missing-import correction

The [existing workflow test](../../tests/mcp-repository-workflow.test.ts)
submits a test snapshot with an unresolved `./dep` import and checks the
terminal `missing_import` diagnostic at `src/main.ts`. The child commit adds
`src/dep.ts` with `export const value = 42;` using the observed parent HEAD.
The second receipt passed manifest, source, syntax, lint and imports with
TypeScript semantic checking deferred. The suite confirmed the parent
relationship, HEAD version 2, idempotent replay and both immutable receipts
after local runtime restart. The intentional failing fixture and the
application were preserved without source changes.

- `npm run validate` passed TypeScript, lint, formatting, CI fingerprint,
  source-size, 205 tests and the production build. Four tests were skipped
  by the default opt-in guards. The production build had no unresolved
  import error.
- The targeted MCP workflow, agent authentication, MCP scope, owner,
  tenant, global admission and workerd recovery run passed 14 tests across
  eight suites.
- Production build sizes were 1,531,062 bytes of Worker JavaScript,
  436,826 bytes of client JavaScript and 15,305 bytes of client CSS.

## Local Codex corroboration

Codex CLI 0.169.0 used native HTTP MCP against the production-built loopback
Worker with an ephemeral, origin-bound local agent JWT. It invoked all six
tools in a fresh local instance and saw HEAD at version 0. Both CI requests
returned queued before terminal status and receipt reads.

| Snapshot        | Commit                                                             | Receipt job                                                           | Outcome                                                  |
| --------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------- |
| Initial         | `144277acb9446503e5e140db5fae040ec4cdd4bf0dc5b77a216aa2cb105acdf7` | `ci_1f8aae5ab9b7863ea21ae40793223cfe44f61c8a3a031927cd15f174cdfe17ca` | `missing_import` at `src/main.ts:1`                      |
| Corrected child | `7bcdb1abb7181b6f9861ea35667463bc77afb5d7402b38a525616c744328dc52` | `ci_cf24100531c542d2bf2155aba6733dd7c48c22efc45d33752e92be458ffa1d9c` | Five active checks passed, TypeScript semantics deferred |

The session completed 17 tool calls. It reread both receipts after HEAD
advanced, replayed the correction with the same key and got the original
commit ID, and received `CONFLICT` on a fresh-key stale-HEAD write. The final
HEAD read still showed the corrected commit at version 2.

## Production preflight

Authenticated DeepSpace CLI 0.44.2 reported the production app
`app_01M7N6X263TDDC26Y59Q1RK23P`, owner role, matching GitHub source,
zero routes, `serving: false` and no hosted URL. The existing `prd` secrets
configuration was listed by name. The candidate declares the existing
RepositoryRoom and AppJobRoom bindings and migrations. Its approved-subject
policy and JWT and owner verification are unchanged. Live binding values
and hosted credential issuance remain unverified.

Support report `8934f453-b71a-4dfb-bcac-54749cab8b48` was previously
acknowledged. The installed feedback command and supported command
reference expose submission only. An exact-ID search in the connected
mailbox found no matching message. The current ticket state could not be
independently verified. [DeepSpace CLI reference](https://docs.deep.space/cli-reference/commands#feedback)

No provider evidence cleared the [four publication gates](pass12d-hosted-security.md):

- Canonical-origin protection before billable Worker execution or an
  equivalent hard provider quota.
- A verifiable maximum Free-tier financial liability, including behavior at
  credit exhaustion.
- Hard CPU and memory enforcement around synchronous parser execution,
  with qualified behavior after forced termination.
- Non-destructive traffic suspension and supported recovery of custom
  Durable Object SQLite state and alarms.

## Hosted results

There is no release ID, deployed SHA or hosted origin for PASS 12E. Hosted
OAuth, `/api/me`, agent issuance, live Codex tool calls, hosted receipts,
dashboard inspection, reconnection and second-account authorization were
unverified. No hosted application requests or CI jobs were initiated.
No deployment, undeploy, purchase, registration or storage change occurred.

The authenticated Free ledger reported 499.9977692 of 500 credits both before
and after preflight, an observed delta of zero. The final app status again
reported `serving: false` with no URL. These observations establish neither
a spending ceiling nor a maximum reporting delay.
