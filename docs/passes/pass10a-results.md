# PASS 10A repository and CI tool qualification

Fetched `main` and verified it matched local HEAD at
`c52f8e71d80892b664de814fb85b3a3262597446`. The starting worktree was clean,
with no intervening commits. The delivery SHA is the commit containing this
report. The application ID, bindings, pipeline fingerprint and dependency
manifests remain unchanged. The app remains undeployed. This pass used local
runtime fixtures and did not register an app, request hosted credentials,
invoke a model session or change production secrets.

## Native tool surface and authorization

The native DeepSpace 0.44.2 dispatcher advertises these tools through REST,
Markdown and MCP discovery.

- `miniagentgit.repository_create`
- `miniagentgit.repository_head`
- `miniagentgit.repository_commit`
- `miniagentgit.ci_request`
- `miniagentgit.ci_status`
- `miniagentgit.ci_receipt`

The tool transport accepts existing user JWTs and DeepSpace agent JWTs under
the existing trusted key and issuer configuration. An agent token requires
the issuer's `/agent` suffix, a single audience string matching the request
origin, the `agent` scope, mandatory expiration and a verified nonanonymous
account subject. Tests reject invalid signature, edited subject, expired or
missing expiration, incorrect issuer/audience, multiple audiences, future
`nbf`, missing or wrong scope, anonymous subjects and forwarded origins.
Ordinary user HTTP routes continue to reject the agent credential.

The canonical repository owner reverifies the original bearer, rejects
unexpected headers and parameters, and applies persisted ownership. Alice's
agent credential could create her own repository and could not read Bob's
HEAD or CI records, write Bob's commits or request CI in his repository. Both
MCP and REST refused each foreign operation. The test compared all application
SQLite tables in Bob's room before and after the refusals and found identical
rows. Direct private binding tests also denied forged headers and foreign
creation and commit attempts. A job or commit ID from Bob's repository could
not be used in Alice's repository.

## Commit and CI evidence

A signed agent used the actual SDK MCP test client to create a repository and
read an empty HEAD in local workerd. The first commit advanced HEAD to version
one and its JobRoom pipeline produced `missing_import` for `src/main.ts`.
The next commit added the missing module using the first commit as expected
HEAD. The second job passed manifest integrity, source policy, syntax, lint
and imports. Both receipts reported TypeScript semantics as deferred. The
passing snapshot still contained a top-level throw, so the observed outcome
also checks that submitted code was not run. Both commits and receipts
persisted across recreation. HEAD pointed to the second commit at version two.

Other coverage includes creation key replay and conflict, commit request
replay, changed semantics under the same key, stale HEAD, one winner for
concurrent CAS requests, lost-response replay, invalid paths, duplicate
changes, malformed UTF-8, file and aggregate text bounds and retained
repository quota. The fixture accepted the full 128 KiB decoded text budget
in a single MCP call. The transport response-loss fixture drops the response
after workerd processes it. The existing repository cancellation test
separately aborts during the SQLite commit and verifies the durable outcome
through replay. Native network-abort delivery during SQLite was not measured.

CI coverage includes duplicate admissions, pending receipts, missing commits
and jobs, unsupported pipelines, cross-repository isolation, cancelled receipts
and an expired receipt after a fenced orphan. The opt-in restart test recreates
workerd between all four checkpoint boundaries. The expiry test observes
alarm settlement in SQLite before reading the expired status and receipt
over MCP. Attempt, generation, checkpoint, parser and retention policy remain
in the existing CI engine. The owner HTTP cancellation adapter accepts an
empty stream supplied by workerd for a bodyless POST and rejects actual bytes.

## Validation

- `npm ci` ran under Node 24.18.0 and npm 11.16.0.
- `npm run validate` passed strict types, lint, formatting, CI fingerprint,
  tracked source size, Vitest and the official Worker/client production build.
- Default suite passed 195 tests in 69 files. Four opt-in tests were skipped.
- The targeted agent/tool suite passed 22 tests in 15 files.
- The opt-in stage restart run passed one test. The parser corpus, aggregate
  and timer run passed three tests. The separate stage expiry run passed one
  test. Four of these five executions are skipped in the default suite.
- A local Chrome smoke tested both themes at 320, 390, 768 and 1440 pixels.
  The onboarding panels advertised local qualification and inactive client
  connections. The smoke found no JavaScript errors, load failures or
  protected requests. Client JS contained no matching JWT/private-key
  patterns or local binding values of at least 24 bytes.

The official production builds measured these raw byte sizes.

| Output                       |  Baseline |  PASS 10A |   Delta |
| ---------------------------- | --------: | --------: | ------: |
| Worker JavaScript            | 1,510,170 | 1,522,527 | +12,357 |
| Six client JavaScript chunks |   415,531 |   415,498 |     −33 |
| Client CSS                   |    13,377 |    13,377 |       0 |
| Client HTML                  |       397 |       397 |       0 |

The Worker syntax check passed. Vite reports Worker gzip sizes of 344.39 kB
at baseline and 347.79 kB for this pass. Source maps and local runtime
bindings are excluded from the table.

The current and baseline npm audits report 16 findings (15 high, one low)
from the same two esbuild and picomatch advisories. npm's transitive
`effects` attribution differed between audit responses for two TypeScript
ESLint packages. The affected package and advisory set, severity totals and
lockfile are unchanged. See [dependency audit](../security/dependency-audit.md).

## Client and launch boundaries

Installed Codex 0.169.0 help advertises Streamable HTTP and a bearer-token
environment variable. Claude Code 2.1.322 help advertises HTTP with an
authorization header. These are configuration capabilities. The SDK client
successfully used the native HTTP protocol and all six advertised schemas.
No Codex or Claude config was changed and no real client session or
credential exchange was attempted against a hosted origin. The public panels
offer no installation commands.

The Babel parser still has no independently established hard CPU or memory
execution boundary. Hosted issuer behavior, renewal, ingress and aggregate
admission remain unqualified. See the [workflow and resource limits](../mcp-repository-workflow.md)
and [parser qualification](../ci-parser-resource-qualification.md).
