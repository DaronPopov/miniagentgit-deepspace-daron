# PASS 06B results

Status: complete static public landing page, preserving PASS 06A's visual tokens,
primitives, route boundaries and dependency policy. No onboarding/auth/dashboard
implementation or PASS 06C work is included.

## Revision and inspection

Starting SHA: `b7eafe56593e9d8eac64b819143666f96cb88e9d`, main, clean worktree
and index. Verified PASS 06A's completed report and baseline 31 suites / 97 tests.
This pass is one standalone commit. Its final SHA is available via
`git log -1 --format=%H -- docs/passes/pass06b-results.md` and the delivery message;
a report cannot contain its own commit hash.

Read AGENTS.md, engineering standards, architecture, API, free-tier budget,
PASS 05 and PASS 06A results. Inspected existing tokens, components, contracts,
route/root, package/routing configuration and import enforcement before editing.
All prior backend, CI and authentication behavior is preserved. Main/router,
SDK/app-ID configuration, authority/storage, CI source/fingerprint, package.json
and lockfile are unchanged. Zero added runtime or development dependencies.

## Layout and modules

The original system-aware light/dark palette, system fonts, width constraints,
radii, spacing and focus treatment remain. The public route still contains only
feature composition. The feature now provides:

- Compact native-link header, hero with architecture/API links and a labelled
  conceptual commit path (not fabricated live data).
- Six capability cards tied to PASS 04/05: immutable text, atomic HEAD, expected
  HEAD conflicts, durable successful replay, bounded scheduling and local tests.
- Four-step agent commit workflow and commit-addressed asynchronous CI explanation.
- Fixed integrity/source-policy checks and persistent fingerprinted receipts,
  with non-execution and request-driven recovery limitations stated plainly.
- Two accessible SVG architecture diagrams, development/free-tier philosophy,
  source-linked documentation, verification/upcoming scope and a minimal footer.

Copy lives in typed `content/landing.ts`, `workflows.ts` and `diagrams.ts`.
Obsolete foundation placeholder content was replaced; reusable CodeSurface and
other PASS 06A primitives remain. NavigationLink now permits HTTPS source/docs
links as well as internal paths/anchors. Components each own hero, feature grid,
workflow, CI explanation, diagrams, documentation or footer. Ordinary CSS is
split into landing layout and diagram styling; no framework or asset library.

Cards use one column on phones, two from 40rem and three from 64rem. Hero columns
and side-by-side diagrams begin at 64rem; diagrams remain stacked on tablets to
preserve label size. Header links and actions wrap naturally. No animation,
external fonts/images, live repository examples, status widgets or protected
API links are introduced. Existing public dependency/cycle rules remain intact.

## Diagrams and accessibility

CommitLifecycleDiagram and CiLifecycleDiagram are independently reusable SVG
presentation components using one small five-stage lifecycle renderer. Metadata
owns labels and descriptions. The paths are:

1. Agent → HTTP API → authenticated repository authority → bounded commit
   scheduler → atomic SQLite commit/HEAD.
2. Immutable commit → durable CI job → bounded fixed validators → persistent
   versioned receipt → agent / explicitly upcoming dashboard.

Captions, SVG title/description, role=img, unique useId references and wrapped
labels provide accessible descriptions without relying on color. Decorative
shapes are hidden from accessibility traversal. Native arrows describe flow;
forced-color rules preserve edges/text. Footnotes explain that only persistence
advances HEAD, in-memory commit scheduling is ephemeral, SQLite owns durable CI
jobs, and CI never owns HEAD. No alternate authority is implied.

One main/h1, labelled sections, native lists/links, visible keyboard focus and
the skip-to-main target are retained. Links navigate in the same tab; there is
no secret/config input, fake demo or unimplemented sign-in action. Hosted auth,
deployment and quotas are labelled unverified. Git compatibility, arbitrary
execution, package installation, ESLint/tests/type checking and MCP are not
advertised. The dashboard and onboarding are explicitly upcoming.

## Exact validation

| Command                                     | Result                                                                                             |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `npm ci`                                    | Passed; 461 installed packages; lock unchanged. Existing one low-severity npm audit item reported. |
| `npm run type-check`                        | Passed strict TypeScript.                                                                          |
| `npm run lint`                              | Passed, zero warnings.                                                                             |
| `npm run format:check`                      | Passed.                                                                                            |
| `npm run check:ci-fingerprint`              | Passed; backend fingerprint unchanged.                                                             |
| `npm run check:size`                        | Passed, 124 tracked TS/TSX files, zero violations. No allowance/exception added.                   |
| `npm test`                                  | Passed, 33 suites / 103 tests; six landing/diagram tests added, all prior tests retained.          |
| `npm run build` (inside `npm run validate`) | Blocked solely at the unchanged official SDK check for `DEEPSPACE_APP_ID="__APP_ID__"`.            |
| `npm run validate`                          | All pre-build gates pass; nonzero at that external prerequisite.                                   |
| `git diff --cached --check`                 | Passed; reviewed paths/content for secrets, generated files and unrelated edits.                   |

New tests cover all page sections and claims, navigation anchors and real local
documentation targets, no fabricated job/repository IDs or advertised unsupported
execution, rendering without hosted auth/app configuration, ordered SVG metadata,
unique accessibility/marker IDs and responsive CSS assumptions. Existing tests
still enforce request-free fresh initialization, readonly props, public-only
imports, browser-target compilation, no import cycles and keyboard semantics.
All real SQLite, scheduler, JWT and workerd/CI integration tests remain passing.

## Local browser and bundle evidence

Used existing Google Chrome 155.0.8059.79 headless, Node and installed esbuild.
No browser framework was installed. A one-off temporary Node fixture bundled the
actual public route component plus global CSS, mounted it with React createRoot,
and served only HTML/JS/CSS on loopback. Chrome used a disposable profile;
DevTools Protocol inspected geometry/network, dispatched Tab/Enter and captured
screenshots. Command: `node /tmp/miniagentgit-landing-smoke.mjs` (temporary smoke
harness, not committed or a new application/build path). Runtime/profile/server
were disposed; screenshots and JSON measurements are temporary `/tmp` evidence.
The normal Vitest browser-target bundle test remains reproducible in the repo.

| Viewport / theme | Layout evidence                                              | Horizontal overflow       |
| ---------------- | ------------------------------------------------------------ | ------------------------- |
| 1440 × 1000 dark | Three card columns; two diagram columns; each SVG 352px wide | None; scroll width 1425px |
| 390 × 844 dark   | Single-column cards/diagrams; SVGs 324px wide                | None; scroll width 390px  |
| 320 × 800 light  | Single column; wrapped controls; SVGs 254px wide             | None; scroll width 320px  |
| 768 × 1000 light | Two card columns; diagrams stacked, 352px SVGs               | None; scroll width 753px  |

Each case: Tab exposed “Skip to content” at top=8px with 3px outline; Enter moved
focus to `main-content`. Four cases produced zero runtime exceptions and only
12 requests (the local HTML, CSS and JS per case), with no protected API, auth,
remote font or backend data request. Inspected full-page desktop and narrow/mobile
screenshots; the header, content, diagrams and footer fit their layouts.

Final temporary fixture bundle: **237,580 JS bytes + 8,033 CSS bytes**, minified,
uncompressed, including React/react-dom and the public route. This is a local
client-fixture measurement, not the official Vite bundle, full router bundle,
provider upload size or a deployment validation. No SDK or secret was needed.

## Limitations and stop boundary

Production Vite configuration still stops before bundling without the registered
app ID. No fake ID, bypass, registration, deployment, credit-consuming runtime
operation, paid integration, cloud load test, SSR or Dynamic Worker was introduced.
The loopback fixture does not prove production routing or hosted authentication.
Chrome geometry/focus tests do not certify every browser, zoom setting, assistive
technology or contrast standard. Light/dark follows system preference.

The one-app Free-tier-first architecture is unchanged; reported allowances remain
planning inputs and actual hosted quotas/costs are unknown. No backend mutation
is possible from public initialization. PASS 06C was not started.
