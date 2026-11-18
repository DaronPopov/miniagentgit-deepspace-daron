# PASS 11B results

**Verdict · PASS.** The browser can inspect real repository, commit, file and CI
data after verifying the signed-in user's identity. The dashboard is ready for
the hosted integration pass. Repository writes remain available through HTTP
and MCP.

- Starting checkout and GitHub `main`: `172992a2cdc78d895cc839c8a17eb8d6c0a1aef0`.
- Final implementation and evidence commit: `f8526b07a6b902e1a7ae6a70449e17e3fcbb2f9e`.
- The following commit adds this report. Run
  `git log -1 --format=%H -- docs/passes/pass11b-results.md` for its exact SHA.

## Implementation

| Area              | Delivered                                                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public product    | Product positioning, setup/docs/account actions, authorized agent workflow and accurate fixed CI explanation.                                                                |
| Public docs       | Native MCP transport, discovery, credentials, six tool contracts, failed-then-corrected workflow, dashboard handoff and existing PowerShell/curl.exe quick start.            |
| `auth-ui`         | Route-scoped SDK account verification, same-origin Bearer GETs, timeout/HTTP outcome classification, abort and session invalidation.                                         |
| `dashboard`       | Known-ID lookup, metadata and empty/current HEAD, bounded parent traversal, commit-specific file pages and inert text previews, CI job pages/status and schema 1/2 receipts. |
| Preview and tests | Authenticated API seeds using ephemeral identity, deterministic browser scenarios, bounded payload checks, and stale-resource tests.                                         |

[Implementation notes](pass11b-implementation-notes.md) enumerate the exact
GET contracts, state ownership and bounds. The dashboard uses an explicit
refresh workflow. Optional browser repository creation and CI admission were
deferred because the route-scoped client only qualifies GET requests.
A write flow needs separately verified idempotency and uncertain-outcome
recovery. No dependency or lockfile changed. The production Worker is
byte-for-byte identical to the PASS 11A build.

## Browser evidence

The official production build ran in isolated local workerd. The pinned
Playwright MCP matrix passed at 1440×1000 and 390×844 in both themes.
[48 screenshots and the diagnostic matrix](../frontend/evidence/pass11b/README.md)

- Public landing, onboarding, MCP docs, Account navigation, signed-out entry,
  unknown-route 404 and unauthenticated API 401 were exercised.
- The ephemeral managed session exchanged a genuine locally signed JWT.
  The browser confirmed `/api/me` before opening the repository. It exercised
  empty HEAD, populated HEAD, parent navigation, tree pagination and inert
  committed text. A held obsolete read was aborted when selection changed.
- CI job pagination and status used the real API. To make pending timing
  deterministic, Playwright replayed the actual 409 captured while the
  fixture job ran. Refresh then fetched the stored failed receipt, including
  missing-import diagnostics. The corrected commit's passing receipt was
  fetched directly. Switching jobs allowed the earlier failure to be
  retrieved again. Historical schema 1 rendering is covered by decoder tests.
- A real foreign repository returned 403, and an unknown ID returned 404.
  Sign-out and browser-clock expiration cleared the protected account view.
- Every capture had a main landmark, one H1 and no page-level horizontal
  overflow. The runner exercised a visible skip-link focus ring, its
  keyboard target, repository input labeling and loading announcements.
  Both themes retained the PASS 11A semantic color tokens and contrast
  pairs. Physical assistive technology and mobile hardware were outside
  this matrix.
- Each scenario recorded five expected HTTP failures and one aborted
  obsolete request. There were zero unexpected HTTP/network errors or
  JavaScript exceptions. Chrome reported the existing obsolete
  `document-domain` Permissions-Policy warning on document loads.

## Automated validation

| Check                                                                            | Result                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                                         | Passed on Node 24.18.0 and npm 11.16.0.                                                                                                                                                                                   |
| `npm run validate`                                                               | Passed types, lint, formatting, CI fingerprint, size, Vitest and production build. 234 tracked source files, zero violations, 198 passing tests in 71 files. Four default opt-in skips.                                   |
| Five opt-in stages/parser tests                                                  | All five passed with `CI_VERIFY_STAGE_RESTART=1 CI_VERIFY_STAGE_DEADLINE=1 CI_VERIFY_PARSER_CORPUS=1` on the stage, deadline, parser runtime, parser corpus and aggregate workerd tests. Included the four default skips. |
| `node scripts/smoke-agent-onboarding.mjs`                                        | Passed eight width/theme combinations. 24 HTTP code panels, 55 requests, zero protected requests, runtime errors or HTTP failures.                                                                                        |
| `python3 scripts/smoke-dashboard.py test-results/pass11b-final`                  | Four passing viewport/theme combinations.                                                                                                                                                                                 |
| `npm ls --all`, `npm audit signatures`                                           | Passed. 462 verified registry signatures, 166 verified attestations.                                                                                                                                                      |
| Full and production-filtered `npm audit --json`                                  | Both exit 1. Full tree has 16 findings (15 high, one low), production-filtered has six (five high, one low). Same picomatch and esbuild advisory identities as PASS 11A.                                                  |
| Worker JS syntax, staged credential-pattern scan and `git diff --cached --check` | Passed. Credential scan checked staged text additions for JWT and private-key patterns.                                                                                                                                   |

Initial validation surfaced a receipt decoder type narrowing issue,
expected icon assertions after the workflow change and browser harness
lint errors. The final suite passed after correcting them. The regression
suite exercised JWT verification, tenant isolation, ownership, atomic HEAD
and idempotency, durable scheduling and receipts, MCP contracts and API
limits. Source and fingerprint comparison confirmed the backend is untouched.
[Existing dependency assessment](../security/dependency-audit.md)

## Production bundle

| Metric                       |  PASS 11A |  PASS 11B |   Delta |
| ---------------------------- | --------: | --------: | ------: |
| Raw Worker JavaScript bytes  | 1,522,527 | 1,522,527 |       0 |
| Raw client JavaScript bytes  |   416,135 |   436,826 | +20,691 |
| Raw client CSS bytes         |    13,213 |    15,305 |  +2,092 |
| Raw lazy dashboard JS bytes  |    55,157 |    70,817 | +15,660 |
| Raw lazy dashboard CSS bytes |         0 |     1,816 |  +1,816 |
| Cold landing transfer bytes  |   122,482 |   122,759 |    +277 |

Raw sizes exclude source maps and local bindings. Cold landing transfer sums
Chrome Resource Timing `transferSize` for navigation and loaded resources
from the isolated workerd preview with a fresh Chrome context. It includes
local response overhead and favicon. The dashboard assets did not appear in
the landing transfer. Most added JS is the lazy dashboard and the MCP
documentation. The application still uses the existing React and SDK stack.

## PASS 12A handoff

1. Obtain deployment authorization. Confirm the assigned app, trusted
   issuer/audience and provider configuration using supported DeepSpace
   workflows. Qualify real managed sign-in, renewal, sign-out and session
   expiry on the hosted origin.
2. Verify native MCP discovery and hosted target-origin token issuance. Use
   an actual coding client with the supported transport and a least-privileged
   test account, and keep tokens out of artifacts.
3. Run the documented creation → empty HEAD → failing commit → failed CI →
   corrected commit → passing CI sequence. Record repository, commit and job
   IDs and sanitized receipts for both runs.
4. Open the returned repository ID on the dashboard. Observe HEAD/version,
   the earlier parent and immutable files, CI execution states and both
   persisted receipts. Confirm another account cannot read the repository.
5. Qualify hosted persistence, resource limits and retry behavior separately.
   Track the existing dependency advisories.

Account-wide listing, first-class paginated commit history, hosted OAuth,
real external coding-client connection and hosted durability/resource
qualification are deferred. This pass made no deployment or hosted resource
changes.
