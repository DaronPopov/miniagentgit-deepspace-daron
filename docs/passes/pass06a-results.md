# PASS 06A results

Status: frontend foundation complete. A thin public route composes typed,
stateless presentation primitives and ordinary CSS tokens within the existing
application. No finished marketing page, onboarding, authentication integration
or dashboard was implemented. Work stops at PASS 06A.

## Revision and inspection

Starting SHA: `18c0fc95dbf3a750718164f1cc291ab1f0b1ab57`, main, clean index and
worktree verified before editing. This pass is delivered as one standalone commit.
Its final SHA is obtainable with
`git log -1 --format=%H -- docs/passes/pass06a-results.md` and reported in the
completion message; a file cannot embed its own commit hash. Prior work was
preserved. No backend, CI, migration, SDK identity, package, lockfile, main entry,
Vite configuration or app-ID modification is included.

Read AGENTS.md, engineering standards, architecture, free-tier budget, API and
PASS 05 results. Inspected frontend entry/route/CSS, package/TypeScript/Vite
configuration, tracked import-cycle tests, file-size checker, installed SDK and
Generouted declarations/runtime. Baseline: 28 suites / 88 tests passed.

Installed versions remain DeepSpace 0.44.2, @generouted/react-router 1.20.3,
React/react-dom 19.3.1, Vite 8.3.8 and Vitest 4.1.12. Node 24.18.0 and npm
11.16.0. Generouted's installed readme and `dist/index-lazy.js` verify that
`src/pages/index.tsx` maps to `/`, lazy routes use Vite import.meta.glob and
optional `_app.tsx` / `_layout.tsx` conventions exist. This pass needs neither
layout route nor provider. The original createBrowserRouter/routes entry stays.
The [official DeepSpace project structure](https://docs.deep.space/get-started/project-structure.md)
was read and confirms the static/provider-free public-page convention. No new
runtime-specific SDK behavior or assumed exports were introduced.

## Modules and design decisions

- `src/features/product-site/contracts/presentation.ts`: readonly navigation,
  feature, section, code-example and architecture-diagram metadata. These carry
  display information only; no business identifiers, JWT or authorization rules.
  No unnecessary variant unions or backend contract duplication.
- `components/site-container.tsx`: constrained layout width and gutters.
- `components/site-section.tsx`: semantic section with associated heading.
- `components/header-shell.tsx`: native labelled navigation, list semantics and
  explicit current-page hint. No menu state, auth state or hidden request.
- `components/code-surface.tsx`: labelled placeholder, never runnable code.
- `components/product-foundation.tsx`: public shell, one main/h1, skip link and
  focusable main target; deliberately minimal foundation text only.
- `content/foundation.ts`: typed navigation/section/example display descriptors.
- `styles/tokens.css` and `styles/layout.css`: system fonts, typography hierarchy,
  spacing scale, light/dark surfaces/text/accent/border/focus colors, radius,
  68rem content and 62ch prose constraints. Native media queries at 40rem/64rem
  adjust gutters/rhythm; header/navigation wrap on narrow screens. System dark
  preference uses CSS; no persistent toggle, store or runtime theme library.
- `src/styles.css`: imports feature CSS, minimal reset/type/focus rules; visible
  3px focus outline, skip-link reveal and forced-color focus support.
- `src/pages/index.tsx`: five-line route composition only. Existing inaccurate
  placeholder copy about unimplemented repository operations is removed.

UI-001–UI-008 are documented in architecture and engineering standards. Tests
scan all tracked public feature TS/TSX: only React and internal feature imports
are allowed, including re-exports; dynamic imports, mutable module declarations,
classes, non-readonly property signatures and explicit network/effect capabilities
are rejected. Negative fixtures cover server/SQL, Hono, SDK, alias, dashboard and
credential imports. The public route remains thin; the browser entry stays
provider-free. Existing project-wide import-cycle checks include these files.
This is an architectural source policy, not a sandbox for malicious JavaScript.

## Tests and exact validation

No dependencies were added or updated. No second package/workspace/build system,
server, component/CSS/icon/theme/animation library or external font/asset was added.
Existing Vitest, React test-only static rendering and esbuild suffice.

| Command                                  | Result                                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm ci`                                 | Passed; 461 packages installed, lockfile unchanged. Existing npm audit reports one low-severity item. |
| `npm run type-check`                     | Passed strict TypeScript, including readonly presentation shapes.                                     |
| `npm run lint`                           | Passed with zero warnings.                                                                            |
| `npm run format:check`                   | Passed.                                                                                               |
| `npm run check:ci-fingerprint`           | Passed; CI implementation/fingerprint unchanged.                                                      |
| `npm run check:size`                     | Passed, 112 tracked TS/TSX source files, zero violations. No allowlist changes/exceptions.            |
| `npm test`                               | Passed, 31 suites / 97 tests: nine frontend tests added, all 88 prior tests retained and passing.     |
| `npm run build` (via `npm run validate`) | Blocked solely at existing SDK app-ID precondition: DEEPSPACE_APP_ID remains `__APP_ID__`.            |
| `npm run validate`                       | All pre-build gates passed; nonzero at the documented external build gate.                            |
| `git diff --cached --check`              | Passed; changed paths/content reviewed for unrelated edits, secrets and generated files.              |

`tests/presentation-contracts.test.ts` checks serializable readonly shapes,
architecture references and actual typed content. `tests/public-boundaries.test.ts`
uses `tests/public-boundary-policy.ts` to enforce positive and negative dependency
boundaries and thin route composition. Its in-memory browser-target esbuild test
bundles the public route and global CSS without warnings or writing files, and
verifies absence of SDK/server/application/domain/credential dependencies. This
is a focused test, not an alternative production build or app-ID bypass.

`tests/public-layout.test.ts` stubs fetch before fresh route initialization and
React rendering, verifies zero calls, one main/h1, heading associations, skip
link/target, native labelled navigation/current-page hints, placeholder escaping,
CSS focus rules, token references, system dark preference, responsive breakpoints
and absence of remote CSS/font requests. React DOM server rendering is used only
as a local markup test; production remains client rendered.

All existing real SQLite, JWT, scheduler, workerd repository and durable CI tests
remain green. No backend logic, commit authority, HEAD mutation, CI behavior,
resource ceiling or credentials changed.

## Limitations and delivery scope

The official Vite build still stops before production bundling; subsequent
production errors remain unverified. The gate was neither disabled nor supplied
with a fabricated ID. No registration, deployment, hosted authentication,
cloud-credit operation or cloud load test occurred. The one-app Free-tier-first
architecture and existing planning assumptions remain unchanged; no new runtime
quota claim is made.

Tests establish markup semantics, CSS intent, imports, request-free initialization
and browser-target compilation. They do not establish rendered browser geometry,
real keyboard/screen-reader behavior, visual contrast certification or hosted
routing. No browser visual verification is claimed. Light/dark behavior follows
OS preference; manual theme switching is deferred. Presentation contract strings
are trusted static content, not a new untrusted-input API.

No finished product copy, onboarding commands, diagrams UI, auth flow, repository
or CI dashboard was built. Future features retain separate module ownership.
PASS 06B was not started.
