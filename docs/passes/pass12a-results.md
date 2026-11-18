# PASS 12A results

**Verdict · FAIL — hosted security gate blocked deployment.** The assigned
production app was registered but undeployed at the start and remained
undeployed at the final status check. No new release, hosted credential or
durable test data was created.

- Starting local and remote `main`: `fee4a5f7a5ad4cff571830c687952ecbb0667767`.
- Final documentation commit: this report's commit, identified by
  `git log -1 --format=%H -- docs/passes/pass12a-results.md`.
- Deployed SHA and release identifier: none for PASS 12A.
- Existing target: `app_01M7N6X263TDDC26Y59Q1RK23P`, GitHub source authority,
  DeepSpace production plane, Free account.
- Former origin: `https://miniagentgit-deepspace-daron.app.space/`. One live
  HTTPS probe returned 404 with valid TLS. Platform metadata reported zero
  routes and `serving: false`. Active traffic and persisted SQLite contents
  were not observable. No data deletion or rollback was attempted.

## Decision and evidence

The Free account reported 500 allocated and 499.9977692 remaining, with
the same balance after read-only checks. Deployment billing, runtime
and storage quotas, trusted-account ingress and an effective spend cap
were not established. Public JWT/ownership controls do not enforce app-wide
resource usage. Official sources give conflicting guidance on Durable Object
retention after undeploy. The gate precluded publication. [Budget](pass12a-free-tier-budget.md)
· [Security review](pass12a-hosted-security.md)
· [Recovery decision](pass12a-deployment-recovery.md)

| Requirement                                                                    | Result                                                                                                    |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Existing app, account and source identity                                      | Verified by authenticated production metadata. One registration, Free tier and existing GitHub authority. |
| Effective free-tier limits and safe exposure                                   | Blocked. Some account/file figures observed. Cost and production protections unverified.                  |
| Hosted routes, assets, browser OAuth and user verification                     | Unverified. Former origin 404 only.                                                                       |
| Real coding agent, production JWT issuance and six-tool discovery/invocation   | Unverified. Installed client versions and candidate transport checked from help only.                     |
| Hosted immutable HEAD, failing/passing CI receipts and dashboard               | Unverified. No hosted writes, job requests or dashboard artifact.                                         |
| Hosted reconnection durability, cross-account isolation, replay and stale HEAD | Unverified. Local regression evidence only.                                                               |
| Resource changes                                                               | No deployment, additional app, purchase, secret modification or other hosted resource change was made.    |

[Agent evidence boundary](pass12a-agent-execution.md)
· [Browser evidence boundary](../frontend/evidence/pass12a/README.md)
· [PASS 12B handoff](pass12a-pass12b-handoff.md)

## Local validation

- `npm ci` and `npm run validate` passed. Node 24.18.0, npm 11.16.0 and
  DeepSpace 0.44.2. The suite passed 198 tests, four default opt-in skips and
  all 234 tracked source checks. The production build and Worker syntax
  check passed.
- The opt-in stage restart, deadline, parser corpus, aggregate and
  runtime suite passed all five tests with the repository's existing flags.
  Seven targeted local JWT/MCP/tenant files passed 17 tests. These use
  ephemeral test identities and establish no hosted behavior.
- Worker JS 1,522,527 bytes, client JS 436,826, client CSS 15,305. No
  production upload. A JWT/private-key pattern scan matched zero of 341
  tracked non-image and compiled client files.
- `npm ls --all` and `npm audit signatures` passed. The registry verified
  462 signatures and 166 attestations. Both audit commands exited 1.
  Full audit reported 16 findings (15 high, one low). Production-filtered
  audit reported six (five high, one low). The underlying picomatch and
  esbuild advisories are unchanged. [Dependency assessment](../security/dependency-audit.md)

Only evidence and handoff documentation changed. The PASS 11B source
remains the validated application candidate.
