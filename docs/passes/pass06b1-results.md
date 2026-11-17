# PASS 06B.1 results

Status: presentation-only Lucide layer complete. PASS 06B copy, content order,
anchors, URLs, product flows, routes and SVG architecture diagrams are preserved.
No PASS 06C onboarding/documentation flow was implemented.

## Revisions and inspection

Starting SHA: `54b3ac67496469d8db8b691255af6ea24b4a45d5`, main; verified clean
index/worktree before edits. This pass is one standalone commit. Its final SHA
is reported on delivery and obtainable via
`git log -1 --format=%H -- docs/passes/pass06b1-results.md`; a file cannot embed
its own Git commit hash.

Read AGENTS.md, engineering standards, architecture and PASS 06A/06B reports.
Inspected current components, tokens, diagram metadata/renderers, contracts,
public import rules and tests. Baseline: 33 suites / 103 tests passing.
Backend/domain/application code, CI execution/fingerprint, identity, root/router,
configuration, authority, API and both SVG lifecycle implementations are unchanged.

## Dependency and compatibility evidence

Exactly one runtime dependency added: **lucide-react 1.74.0**, pinned exactly.
`npm view lucide-react dist-tags peerDependencies dependencies --json` reported
latest stable 1.74.0; verified the version-specific metadata before installation.
Its React peer range includes `^19.0.0`, compatible with installed React 19.3.1;
optional @types/react peer is satisfied by existing types. The package declares
sideEffects=false and no additional runtime dependencies.

Commands: `npm install --save-exact lucide-react@1.74.0`, then `npm ci`.
Lockfile review confirms one new package entry, node_modules/lucide-react, and
no existing version changes. Root dependency and resolved URL/integrity are
recorded. Existing @types/react and csstype entries changed from dev to
**devOptional** because the new package has an optional types peer; their
versions/integrities are unchanged. No other library, icon pack or framework.

Inspected installed exports/types and the [official React guide](https://lucide.dev/guide/react).
This stable release does **not** export Github. Existing GitHub labels instead
use ExternalLink; no older dependency, logo asset or additional icon pack was
introduced to imitate a missing export.

## Finite icon vocabulary and changed components

`contracts/icons.ts` defines the finite readonly presentation-name union.
`components/site-icon.tsx` has ten static named imports and one fixed typed
lookup; no namespace, arbitrary name input, dynamic loader or whole-library
registry exists. No repository/user data supplies icon names. Optional icon
metadata extends existing NavigationLink and FeatureDescription contracts.

| Semantic name | Lucide component    | Current use                                                                |
| ------------- | ------------------- | -------------------------------------------------------------------------- |
| repository    | GitBranch           | Header brand, repository scheduling/philosophy, architecture documentation |
| commit        | GitCommitHorizontal | Successful replay and versioned CI outcomes                                |
| validation    | ShieldCheck         | Authorization, integrity checks and local evidence                         |
| source        | FileCode2           | Text snapshots, preparing changes and source policy                        |
| api           | Terminal            | Existing API action/documentation link                                     |
| persistence   | Database            | Atomic storage, quota/philosophy and budget documentation                  |
| concurrency   | GitCompareArrows    | Conflicts and resolving commit outcomes                                    |
| documentation | BookOpen            | Local test-evidence documentation                                          |
| next          | ArrowRight          | Existing primary hero link                                                 |
| external      | ExternalLink        | Existing external documentation/GitHub links                               |

HeaderShell, Hero, FeatureGrid, CommitWorkflow, DocumentationLinks and SiteFooter
now render icons in place. CiExplanation receives them through its existing
FeatureGrid and typed check metadata, without changing its flow. The old hidden
external-arrow glyph is replaced by the hidden ExternalLink SVG. No visible
label is removed or changed. Static exported content from landing/workflows was
compared against the starting Git revision with only icon fields stripped:
all remaining values, copy, arrays, URLs and ordering are identical.

`styles/icons.css` supplies consistent 20px icons, 16px compact navigation icons,
1.75 stroke width, token spacing and existing currentColor/accent treatment.
Icons do not shrink. Navigation spacing accommodates the new external indicator
at phone widths; existing responsive columns and page composition are retained.
The dedicated Lucide import path is documented and enforced in public-boundary
tests; server, credential, SDK, Hono and dashboard exclusions remain unchanged.

## Accessibility and browser evidence

Every decorative icon has aria-hidden=true and focusable=false. All original
text labels and link semantics remain; no icon-only control or new interaction
is added. Native skip link, keyboard order, 3px focus outline and section headings
are retained. Both architecture SVG titles/descriptions/markers are unchanged.

Repeated the PASS 06B Chrome 155.0.8059.79 matrix using a disposable loopback
client fixture, existing Node/esbuild and DevTools Protocol. The actual route
component and CSS were mounted with React createRoot, without an app ID, secret,
auth provider or backend. No browser dependency/framework was added. The one-off
`node /tmp/miniagentgit-landing-smoke.mjs` harness/profile/server were disposed;
JSON/screenshots are temporary /tmp evidence, not production artifacts.

| Viewport / theme | Scroll width | Icon clipping / runtime exceptions |
| ---------------- | -----------: | ---------------------------------- |
| 320 × 800 light  |        320px | None                               |
| 390 × 844 dark   |        390px | None                               |
| 768 × 1000 light |        753px | None                               |
| 1440 × 1000 dark |       1425px | None                               |

No horizontal overflow. All 31 rendered icons remained at least 16px, inside
parent/viewport horizontal bounds, hidden and nonfocusable. Inspected full-page
desktop and narrow screenshots: no observed broken layout or clipped symbols;
normal heading wrapping accommodates icons. Card and diagram columns retain the
PASS 06B breakpoints. Tab revealed the skip link at top=8px with a 3px outline;
Enter focused main-content in each case.

Chrome accessibility trees expose the original 14 named links and exactly the
two architecture images (“Repository commit lifecycle” / “Asynchronous CI
lifecycle”); the 31 decorative icons add no accessible names/images or controls.
Four cases made only 12 local HTML/CSS/JS requests, matching baseline, with no
protected API, auth, remote icon, font, backend or CI activity.

## Reproducible client bundle comparison

`node scripts/measure-public-bundle.mjs` performs a deterministic, write:false,
minified browser-target esbuild compilation of the public route + CSS mounted
with React createRoot. Production NODE_ENV, ESM and automatic JSX settings match
the Chrome fixture. It includes React/react-dom; it is not the full router or
SDK app. The same command/options were run before and after this pass.

| Minified, uncompressed output | Starting revision | With Lucide layer |        Delta |
| ----------------------------- | ----------------: | ----------------: | -----------: |
| JavaScript                    |     237,580 bytes |     245,665 bytes | +8,085 bytes |
| CSS                           |       8,033 bytes |       8,740 bytes |   +707 bytes |
| Total                         |     245,613 bytes |     254,405 bytes | +8,792 bytes |

No compiler warnings. The delta includes selected Lucide SVGs/helpers, the finite
adapter, metadata/component markup and icon CSS; existing dependency versions
are unchanged. It is not a per-icon cost, compressed transfer size, provider asset
quota, official Vite bundle or deployment measurement.

To repeat against a separate clean historical checkout, first save this script
from the delivered main revision with
`git show main:scripts/measure-public-bundle.mjs > /tmp/measure-public-bundle.mjs`.
In each desired checkout run npm ci, then `node /tmp/measure-public-bundle.mjs`.
The script resolves esbuild/source from the current working directory and writes
no generated files; no SDK registration or app-ID substitution is involved.

## Exact validation and limits

| Command                                  | Result                                                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm ci`                                 | Passed, 462 packages installed. Existing one low-severity audit item remains reported.         |
| `npm run type-check`                     | Passed strict TypeScript.                                                                      |
| `npm run lint`                           | Passed, zero warnings.                                                                         |
| `npm run format:check`                   | Passed.                                                                                        |
| `npm run check:ci-fingerprint`           | Passed; CI source identity unchanged.                                                          |
| `npm run check:size`                     | Passed, 127 tracked TS/TSX files, zero violations; no exceptions or adapter allowance changes. |
| `npm test`                               | Passed, 34 suites / 106 tests; all prior 103 tests plus three focused icon tests.              |
| `node scripts/measure-public-bundle.mjs` | Passed, sizes above, zero warnings, no disk output.                                            |
| Local Chrome matrix                      | Passed four viewports; no overflow, clipped icons, new requests or runtime exceptions.         |
| `npm run build` (via validate)           | Blocked at unchanged SDK DEEPSPACE_APP_ID=**APP_ID** requirement.                              |
| `npm run validate`                       | All pre-build gates pass; nonzero at that external build prerequisite.                         |
| `git diff --cached --check`              | Passed; reviewed dependency graph, content, diagrams, secrets and unrelated-file boundaries.   |

Focused tests verify all ten semantic SVG selections, static imports and bounded
lookup, major-component rendering, decorative accessibility, retained labels,
section order and rejection of dynamic/namespace imports. Existing tests retain
request-free public initialization, navigation/anchors/copy/claims, no auth
configuration, import cycles and all backend/SQLite/workerd/CI coverage.

Official production bundling still stops before compilation; later production
errors remain unknown. Local client-fixture/Chrome evidence is not hosted routing,
authentication, accessibility certification or deployment validation. No app
registration, fake app ID, guard bypass, deployment, cloud credits, paid service,
SSR, Dynamic Worker, backend workload or PASS 06C flow was introduced.
