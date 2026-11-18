# PASS 12B results

**Engineering verdict · PASS. Hosted readiness · NO-GO.** Local hardening
and recovery qualification passed. Production ingress, billing, parser
containment and non-destructive hosted recovery remain blockers. No
deployment was authorized or attempted.

- Starting local and remote SHA: `c8030ebc89b2cb2209e640f5cc9584e97963f9a5`.
- Final implementation and evidence SHA: `3ea81ff92db812bbab0c347000165dc643335a62`.
- This report follows in a documentation-only commit. Run
  `git log -1 --format=%H -- docs/passes/pass12b-results.md` for its exact SHA.
- The assigned Free production app `app_01M7N6X263TDDC26Y59Q1RK23P` still
  reports `serving: false`, historical release sequence 1. Read-only
  before/after account responses both showed 500 allocated, 499.9977692
  remaining and 0.0022308 used. No paid resources or site changes were made.

## Changes and boundaries

- `src/server/admission/`, `src/server/{app,api,deepspace}`, and `worker.ts`
  add server-side approved-subject policy and a private SQLite admission
  ledger for request windows, protected concurrent handlers, distinct owner
  IDs, creation and CI starts. Existing canonical owner and JWT verifiers
  remain in use. Unknown configuration and lost leases fail closed.
- `scripts/{preview-frontend,smoke-dashboard,measure-admission}.*` exercise
  real local limits with ephemeral identities and provide a bounded
  benchmark. `tests/` adds concurrent admission, CI admission, lost-slot
  restart and exact snapshot restore coverage.
- `docs/{passes,security,operations}/` records the baseline, platform
  evidence, provider escalation draft, risk decisions and recovery plan.
  See `git diff --name-status c8030eb 3ea81ff92db812bbab0c347000165dc643335a62` for the complete
  implementation path list. No dependency, lockfile, Worker class list,
  Wrangler migration tag, CI pipeline or fingerprint changed.

[Admission design](../security/global-admission.md) ·
[Platform assessment](../security/deepspace-platform-guarantees.md) ·
[Recovery runbook](../operations/deployment-recovery.md)

## Qualification

| Check                                                                                                                      | Result                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`, `npm run validate`                                                                                               | Passed on Node 24.18.0/npm 11.16.0. 205 tests in 75 files, four default opt-in skips, 240 tracked source files and zero size violations. TypeScript, lint, formatting, fingerprint and production build passed.                                                                                                                                                |
| Opt-in CI suite with `CI_VERIFY_STAGE_RESTART=1 CI_VERIFY_STAGE_DEADLINE=1 CI_VERIFY_PARSER_CORPUS=1` and `--maxWorkers=1` | Five tests passed. Covered stage restart, orphan deadline, parser runtime, 40-case workerd corpus and dense aggregate. Corpus batches have fresh local ledgers and each obeys the production policy.                                                                                                                                                           |
| Playwright MCP and existing onboarding browser smoke                                                                       | Four combinations at 1440×1000 and 390×844, light/dark, passed. 48 local screenshots and diagnostic summaries in `test-results/pass12b-qualified`. Each viewport runs a separate full workflow in an isolated local runtime. Five expected HTTP errors and zero unexpected browser failures per scenario. Existing onboarding smoke passed eight combinations. |
| Local parser process corpus                                                                                                | 40 fixtures × three samples, zero unexpected outcomes. Node process measurements reached 18.97 ms wall, 39.55 ms CPU and 76,092 KiB peak RSS across samples. These are observed maxima, with no hosted hard-limit inference.                                                                                                                                   |
| Dependency audit and signature verification                                                                                | 16 findings in full tree and six production-filtered due to the same two advisory identities. Both audits exited 1. `npm ls --all` and `npm audit signatures` passed with 462 registry signatures and 166 attestations. [Dependency review](../security/pass12b-dependency-review.md)                                                                          |
| Local stopped-runtime backup, restart and fresh restore                                                                    | Exact 12-response SHA-256 digest matched `2e846d10ed2e68b9e27eef6c289f9437c6dfb9482b8e68fc51bdab3a94464711` before and after. Foreign-owner denial and idempotent replay passed. This fixture's two-job workflow took 680 ms and backup/restart/restore/API verification took 2,629 ms.                                                                        |
| Build/scope integrity                                                                                                      | Worker JS syntax and staged JWT/private-key pattern checks passed. Hosted auth or billing was not inferred from fixtures.                                                                                                                                                                                                                                      |

The initial browser run exposed shared-budget starvation of sign-out by
routine token exchange. Those operations now use independent lanes. The
serial browser matrix uses a fresh app fixture per scenario to avoid making
four back-to-back workflows compete for one production minute. The opt-in
suite initially encountered the new CI quota and missed checkpoint timing
while the Worker awaited lease cleanup. Corpus batches now fit the same
admission policy, and lease cleanup uses `waitUntil` after a handler unwinds.
No stage assertions or production caps were relaxed to pass these tests.

## Resource comparison

`node scripts/measure-admission.mjs <built-PASS-12A-checkout> .` sampled
20 sequential signed `/api/me` dispatches after three warm-ups on each local
build. These are loopback wall-clock observations. Throughput is for this
single sequential stream. The persistence sizes include local engine
metadata and any SQLite journal files.

| Metric                              |        PASS 12A |        PASS 12B |
| ----------------------------------- | --------------: | --------------: |
| Median identity request             |        1.459 ms |        1.613 ms |
| p95 identity request                |        2.123 ms |        2.326 ms |
| Sequential requests/sec             |             616 |             583 |
| Local fixture persistence directory |    90,272 bytes |   633,928 bytes |
| Raw Worker JS                       | 1,522,527 bytes | 1,531,062 bytes |
| Raw client JS                       |   436,826 bytes |   436,826 bytes |
| Raw client CSS                      |    15,305 bytes |    15,305 bytes |

The client directory was byte-identical. A comparable PASS 12A CI/recovery
wall-time series, peak Worker isolate memory, hosted SQLite allocation and
hosted latency are unavailable. The isolated parser process measurements
above do not fill those gaps.

## Hosted readiness gates

| Gate             | Decision                                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Safe ingress     | NO-GO. Local admission qualifies after Worker entry. Canonical-origin edge protection remains unverified.                                    |
| Cost protection  | NO-GO. Account balance verified. Free exhaustion, hard cap, metering and overages remain unverified.                                         |
| Parser isolation | NO-GO. Fixed inputs and durable fencing qualify locally. No enforced hard CPU or memory isolation.                                           |
| Recovery         | NO-GO for hosted. Local same-version restore qualified. Production suspend, custom backup coverage and undeploy semantics remain unresolved. |
| Authentication   | Local PASS. Existing JWT and owner checks preserved. Hosted OAuth and agent credentials remain unverified.                                   |
| CI durability    | Local PASS. Both terminal receipts and exact immutable state survived restart and fresh recovery.                                            |
| Dependencies     | Risks assessed individually. No supported narrow fixes were established.                                                                     |
| Regression       | Local PASS. Established suites, opt-in tests and browser matrix passed.                                                                      |

The exact prerequisites for resuming hosted PASS 12A are in the
[hosted requalification plan](pass12b-hosted-requalification-plan.md).
The provider escalation draft is ready for operator review and has not
been sent. Production controls and secrets remain unchanged.
