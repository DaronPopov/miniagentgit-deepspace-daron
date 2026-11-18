# PASS 12D results

**Hosted FAIL, blocked before publication. Local real-agent workflow PASS.**

Starting SHA and validated application candidate:
`de30bfc3f849530fb2e97e234050332a45ad3cf1`. This report's enclosing
documentation commit is the final handoff revision. Application source,
production configuration, manifests and dependencies are identical to the
candidate SHA. No deployment revision or hosted URL was created.

The assigned Free app `app_01M7N6X263TDDC26Y59Q1RK23P` reported
`serving: false` both before and after qualification. The observed balance
held at 499.9977692 of 500 credits. There were no application test requests
to DeepSpace and no purchases or registered resources. No production OAuth,
agent issuance, hosted tenant tests or hosted restore occurred.

| Check                                     | Actual outcome                                                                                                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                  | Passed with the checked-in lockfile                                                                                                                              |
| `npm run validate`                        | Passed TypeScript, lint, formatting, CI fingerprint, tracked source size, 205 tests and production build. Four default tests were skipped by their opt-in guards |
| Five opt-in tests                         | 5 passed with stage restart, stage deadline and parser corpus flags enabled, including runtime and aggregate parser checks                                       |
| Targeted JWT, MCP, admission and recovery | 24 passed across 11 suites, including owner isolation, shared admission and restore                                                                              |
| Production artifact sizes                 | 1,531,062 B Worker JS, 436,826 B client JS, 15,305 B CSS                                                                                                         |
| Browser smoke                             | All four viewport/theme combinations passed on independent local fixtures                                                                                        |
| Secret-pattern scan                       | No matches for private key blocks, GitHub PAT shapes or compact JWT patterns in repository source and evidence                                                   |
| `npm audit` and `npm audit --omit=dev`    | Findings remain. Registry reported 16 and 6 package findings respectively, zero critical                                                                         |

The assessed upstream advisories remain picomatch
[`GHSA-fc5q-39xc-vjpf`](https://github.com/advisories/GHSA-fc5q-39xc-vjpf)
and esbuild
[`GHSA-g7r4-m6w7-qqqr`](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr).
The flagged paths are in the toolchain, including packages that npm counts
through the installed SDK graph. The existing assessment found no reachable
deployed Worker path for these advisory behaviors. No dependency versions
or test thresholds changed. [Dependency assessment](../security/pass12b-dependency-review.md)

Files changed in this pass are this report and the six linked evidence and
handoff documents below.

- [Deployment preflight and artifact sizes](pass12d-deployment-evidence.md)
- [Real Codex MCP execution and receipt IDs](pass12d-agent-execution.md)
- [Hosted safety gate](pass12d-hosted-security.md)
- [Dashboard qualification](pass12d-dashboard-verification.md)
- [Recovery state](pass12d-recovery-state.md)
- [PASS 13A handoff](pass12d-pass13a-handoff.md)
