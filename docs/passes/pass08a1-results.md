# PASS 08A.1: dependency security and severity audit

## Baseline and delivery

Repository: `DaronPopov/miniagentgit-deepspace-daron`, branch `main`.
Starting SHA: `c29505bc03d9d1d4c4323696aa31402cd24a080f`; worktree clean.
The final SHA is the commit containing this report, available with
`git log -1 --format=%H -- docs/passes/pass08a1-results.md` and reported at delivery.

The application remains **undeployed**. No app registration, deployment, cloud
credit workload, platform request, hosted smoke or secret change occurred.
Network access was limited to public documentation/advisory/registry reads,
npm installation/verification and authorized GitHub delivery. No external scanner
received application source or dependency manifests.

## Assessment outcome

The [dependency audit](../security/dependency-audit.md) records all sixteen npm
entries, exact versions/paths, advisory identifiers, affected/fixed ranges,
exposure, trust boundaries, priority, supply-chain checks and reproduction.
[Committed evidence](../security/evidence/pass08a1/) retains audit JSON, the full
installed tree, outdated snapshot and emitted production module/hash inventory.

| Measure                                                   |            Before |             After |
| --------------------------------------------------------- | ----------------: | ----------------: |
| Distinct advisories                                       |                 2 |                 2 |
| npm package findings                                      |                16 |                16 |
| High / low findings                                       |            15 / 1 |            15 / 1 |
| Production-filtered npm findings                          | 6 (5 high, 1 low) | 6 (5 high, 1 low) |
| Full-audit entries absent from production-filtered report |                10 |                10 |
| Advisories affecting build/development tooling            |                 2 |                 2 |
| Credible production P0/P1 dependency exposures identified |                 0 |                 0 |
| Resolved advisories                                       |                 — |                 0 |
| Dependency changes / additions / overrides                |                 0 |                 0 |

All fifteen high findings propagate **GHSA-fc5q-39xc-vjpf** in picomatch;
they are not fifteen independent exploits. The low finding is
**GHSA-g7r4-m6w7-qqqr** in esbuild. Production-filtered installation membership
comes from SDK build dependencies and optional test-tool peers, not shipped
vulnerable runtime functionality. Both advisories concern tooling even though
six npm entries survive `--omit=dev`.

Picomatch is **P2**: plausible build/lint/test denial of service with malicious
pattern/configuration input. No patched release is published (latest 4.0.7).
Esbuild is **P3 for current use**: the vulnerable Windows servedir server is
unused by current build/test callers and is absent from shipped code; it would
be a P2 developer-file disclosure risk if introduced. Its 0.28.1 patch is outside
DeepSpace 0.44.2's `^0.27.0` range. Updating the root alone leaves the SDK path;
a forced override lacks full SDK CLI/documentation compatibility evidence.

**Remediations applied: none. Remediations deferred: both advisories**, for the
reasons above. No audit fix/force, arbitrary downgrade, vendor patch or suppression
ran. package.json, package-lock.json, engines and SDK/runtime versions are unchanged.
No new production-security qualification is claimed, and the audit is not clean.
No credible unresolved P0/P1 dependency blocker was identified in the current
build. Existing hosted/authentication/client-compatibility and resource-limit
qualification gaps remain outside this dependency pass.

## Bundle and supply-chain evidence

Official Vite/Cloudflare/DeepSpace build passes with its app-ID guard intact.
Production output byte counts and hashes are identical before and after:

| Output                         | Before bytes |  After bytes |
| ------------------------------ | -----------: | -----------: |
| Worker JavaScript              |    1,001,641 |    1,001,641 |
| Six browser JS chunks combined |      412,600 |      412,600 |
| Client CSS / HTML              | 13,080 / 397 | 13,080 / 397 |

Vite reports Worker 1,001.64 kB / 236.51 kB gzip. Supplementary emitted-module
inspection covers both official build environments (172 Worker module entries
and six browser JS chunks). The 165-source Worker map and SDK import inspection
agree: picomatch/esbuild and the affected tooling paths are absent. The fixed
application CI validator never executes stored repository configuration or
invokes these build tools. This establishes current local code/build exposure,
not hosted availability, runtime performance or a general security guarantee.

Two clean `npm ci` runs passed under Node 24.18.0 / npm 11.16.0, each installing
462 packages and auditing 463. `npm ls --all` passed. `npm outdated` reported
available updates, preserved without unrelated upgrades. `npm audit signatures`
verified **462 registry signatures and 166 attestations**. All resolved tarballs
remain on registry.npmjs.org. Existing install scripts, lockfile integrity values,
maintainer/source identity and engine compatibility were inspected; no new
package, script, override or distribution source was introduced.

## Final validation gate

`npm run validate` passed:

| Gate                         | Result                                                     |
| ---------------------------- | ---------------------------------------------------------- |
| npm run type-check           | pass                                                       |
| npm run lint                 | pass                                                       |
| npm run format:check         | pass                                                       |
| npm run check:ci-fingerprint | pass, unchanged identity                                   |
| npm run check:size           | 179 tracked TS/TSX files, zero violations                  |
| npm test                     | **52 suites / 153 tests passed**, zero failed/skipped      |
| npm run build                | official Worker and static client production builds passed |
| npm audit --json             | exit 1, expected: 16 findings, two distinct advisories     |
| npm audit --omit=dev --json  | exit 1, expected: six findings, same two advisories        |

The unchanged suite covers JWT signature/issuer/audience rejection;
Alice/Bob/Charlie isolation and repository owner authorization; immutable commits,
atomic HEAD and replay; CI integrity/generation fencing; MCP/agent-tool
authentication and bounded inputs; and public frontend rendering/import boundaries.
Actual local workerd SQLite scenarios remain distinct from Node unit tests.
No fresh physical-browser or hosted smoke claim follows from markup tests.
No application-route vulnerability was discovered, so no new exploit/regression
fixture or unrelated behavior change was necessary.

Final review is limited to these audit documents and dependency metadata evidence.
No source, manifest/lockfile, CI policy, generated route, credential, runtime state
or build artifact is committed. Existing local secret files and ignored generated
output remain outside Git. PASS 08B, agent credential admission, extra tools,
JobRoom migration, dashboard changes and deployment were not implemented.

Monitor the two upstream advisories and SDK-supported fixes, repeat audits after
lock changes/before authorized activation, and repeat bundle/exposure tracing
when imports, build tools or CI behavior change. **Stop after PASS 08A.1.**
