# PASS 12B dependency review

The pinned DeepSpace 0.44.2 installation and lockfile are unchanged. The
November 18 registry audit reproduces 16 package findings (15 high and one
low), six with `--omit=dev` (five high and one low), from two advisory
identities. Both audit commands exit 1. The production-filtered report is
a dependency-tree view, not a Worker bundle reachability result.

| Advisory                                                                           | Locked paths and applicability                                                                                                                                                                             | Decision                                                                                                                                                             |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [picomatch GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) | 2.3.2 via Generouted → fast-glob → micromatch. 4.0.7 via Vite/Vitest and glob helpers. These are build/config/test glob paths, with no untrusted application glob API.                                     | Registry latest checked was 4.0.7 and the advisory lists no patched version. No compatible narrow patch. Residual build-time risk remains for untrusted patterns.    |
| [esbuild GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr)   | 0.27.7 through the root tooling pin, DeepSpace and Vite. The vulnerable Windows development server operation is outside the Linux build API and deployed Worker path. Wrangler contains 0.28.2 separately. | Fixed since 0.28.1. DeepSpace 0.44.2 declares ^0.27.0. An override crossing that range would be unsupported without an SDK compatibility qualification. No override. |

The earlier [bundle reachability audit](dependency-audit.md) inspected both
advisory paths. PASS 12B adds only local admission logic and tests, with no
integration of either tool into production handler code. No advisory
reproduction or exploit ran. Re-run the same audit after any supported SDK
or glob update, then validate and qualify the browser workflow.
