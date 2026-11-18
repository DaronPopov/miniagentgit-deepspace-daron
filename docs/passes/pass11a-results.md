# PASS 11A results

**Verdict · PASS.** The frontend audit, reusable design foundation, local
browser matrix and PASS 11B implementation contract are complete. GitHub
`DaronPopov/miniagentgit-deepspace-daron` remains the source authority on
`main`. The starting checkout and validated implementation checkout were clean.

- Starting HEAD and GitHub `main`: `72538b6f67e94aef217315d43406450607a79c3b`.
- Final implementation and evidence commit: `e406bbd9109790a727d6c939d5fab042c035ad80`.
- This results file is in the following documentation-only commit.
  `git log -1 --format=%H -- docs/passes/pass11a-results.md` identifies that commit.

## Changes

| Paths                                                                                | Change                                                                                                  |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `src/main.tsx`, `src/styles.css`                                                     | Lazy route loading status and shared keyboard focus.                                                    |
| `src/features/product-site/{components,content,styles}`                              | Central tokens, reusable surfaces and controls, Account navigation.                                     |
| `src/features/agent-onboarding/{integration-panel,integration-selector,styles}`      | Shared surfaces and focus for existing native controls.                                                 |
| `src/features/onboarding/{components/code-panel,content/guide,styles/documentation}` | Shared button styles, Account navigation and accurate MCP and fixed CI descriptions.                    |
| `src/features/auth-ui/{auth-controls,auth-shell,styles}`                             | Shared provider and sign-out buttons and labeled auth error color.                                      |
| `tests/{landing-content,public-boundaries,public-layout}.test.ts`                    | Assertions for public links, route loading and shared focus.                                            |
| `scripts/{preview-frontend.mjs,preview-frontend-identity.mjs,smoke-frontend.py}`     | Local production-build preview, test identity and Playwright MCP matrix.                                |
| `README.md`, `docs/frontend/`, `docs/passes/pass11a-*.md`                            | Reproduction, audit, design system, 28 PNGs, four inspection summaries, next-pass contract and results. |

Run `git diff --name-status 72538b6f67e94aef217315d43406450607a79c3b e406bbd9109790a727d6c939d5fab042c035ad80`
for the complete implementation and evidence file list. JWT, HTTP/MCP,
owner storage, commit and CI implementation and fingerprint remain unchanged.
No npm dependencies were added or removed. Playwright MCP was adopted as a
pinned out-of-tree tool. Chrome DevTools MCP and Figma MCP remain optional.
Radix and a new component framework were declined.
[Tooling assessment](../frontend/agent-ui-tooling.md)

## Browser evidence

Playwright MCP and Chrome inspected 1440×1000 and 390×844 viewports on Linux.
Both revisions covered landing, docs, signed-out entry, JWT-verified signed-in
account, missing route and unauthorized API navigation. A second unconfigured
preview exercised managed-auth failure. Checks covered landmarks, headings,
input labels, no page overflow, resolved fragment targets, keyboard focus,
skip-to-main and Home → Docs navigation. Both fixture viewports observed
`GET /api/me` 200 and a return to signed-out state after sign-out.

The baseline had eight lazy-route warnings in the fixture matrix and six in the
unconfigured matrix. The final matrices had zero warnings. The deliberate 401,
404 and 503 were the only monitored HTTP and console errors. The existing
onboarding smoke covered responsive widths in both themes, keyboard radio
selection, exact copying and 24 docs panels. A targeted Playwright check held
the landing JS chunk at both widths and confirmed the loading status, a stable
ready H1 across two animation frames, and Account navigation to signed-out
entry. Page-wide CLS was outside the measurement. Minimum checked text/status
contrast against page/surface was 6.24:1 light and 7.74:1 dark. Focus contrast was
5.85:1 and 9.55:1 respectively. [Screenshots and inspection](../frontend/evidence/pass11a/README.md)

## Validation

| Command or check                                                                                                                                                                                                                                                                              | Actual result                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                                                                                                                                                                                                                                                      | Exit 0 on Node 24.18.0 and npm 11.16.0.                                                                                                                                                                                                                                      |
| `npm run validate`                                                                                                                                                                                                                                                                            | Exit 0 on the staged implementation. Types, lint, formatting, CI fingerprint, 224 checked source files with zero violations, 195 passing tests, four opt-in skips, and the official Worker/client build.                                                                     |
| `CI_VERIFY_STAGE_RESTART=1 CI_VERIFY_STAGE_DEADLINE=1 CI_VERIFY_PARSER_CORPUS=1 npm test -- tests/ci-stages-workerd.test.ts tests/ci-stage-deadline-workerd.test.ts tests/ci-parser-runtime-workerd.test.ts tests/ci-parser-corpus-workerd.test.ts tests/ci-parser-aggregate-workerd.test.ts` | Exit 0. Five tests passed across five files, covering all four default skips.                                                                                                                                                                                                |
| `python3 scripts/smoke-frontend.py <loopback> <output> [--local-identity]`                                                                                                                                                                                                                    | Exit 0 for baseline and final, with and without the local identity.                                                                                                                                                                                                          |
| `node scripts/smoke-agent-onboarding.mjs`                                                                                                                                                                                                                                                     | Exit 0. Eight width/theme settings and 55 requests. Zero runtime exceptions, HTTP failures or protected requests.                                                                                                                                                            |
| `npm ls --all`, `npm audit signatures`                                                                                                                                                                                                                                                        | Exit 0. 462 verified registry signatures and 166 verified attestations.                                                                                                                                                                                                      |
| `npm audit --json`, `npm audit --omit=dev --json`                                                                                                                                                                                                                                             | Both exit 1 at baseline and final. Full tree has 16 findings (15 high, one low). Production-filtered tree has six (five high, one low). Both reports trace to the existing picomatch and esbuild advisories. Counts, advisory identities and lockfile are unchanged.         |
| `node --check dist/miniagentgit_deepspace_daron/index.js`, client and staged text credential-pattern scans, `git diff --cached --check`                                                                                                                                                       | Passed. Pattern scans checked for JWTs and private keys.                                                                                                                                                                                                                     |
| Raw production size comparison and `node scripts/measure-public-bundle.mjs`                                                                                                                                                                                                                   | No pre-existing numeric client bundle gate was found. The pass-local comparison allowed under 1 KiB growth for total raw client JS and CSS, with identical Worker/HTML sizes. The measured growth was 473 bytes. The home-only esbuild fixture completed with zero warnings. |

The first validation attempt failed two frontend source assertions. One
expected the exact router-construction string, and one prohibited a link to
the account entry. Both assertions were updated for the intentional changes.
Public SDK and protected API assertions remain active.

Passing tests covered JWT enforcement, tenant isolation and ownership,
atomic HEAD updates and replay, durable CI receipts and native MCP
discovery/invocation. [Existing dependency assessment](../security/dependency-audit.md)

## Raw production bytes

| Output                       |  Baseline | Foundation | Delta |
| ---------------------------- | --------: | ---------: | ----: |
| Worker JavaScript            | 1,522,527 |  1,522,527 |     0 |
| Six client JavaScript chunks |   415,498 |    416,135 |  +637 |
| Client CSS                   |    13,377 |     13,213 |  −164 |
| Client HTML                  |       397 |        397 |     0 |

Excludes source maps, local runtime bindings and unchanged static files. The
separate home-only esbuild fixture measured JS 261,366 → 261,546 bytes and CSS
13,321 → 13,167 bytes uncompressed.

## Remaining limits

The documented `npm run dev -- --host 127.0.0.1` requires a DeepSpace session
and synchronizes platform secrets. Qualification used the official build and
local workerd preview without requesting platform state. No registration,
deploy, hosted OAuth/provider round trip or external agent connection ran.
The fixture verifies the real managed bridge, JWT verification and account
shell against an isolated test upstream. Application availability remains
inactive per the repository record.

Windows commands, physical mobile input, alternative browser engines and
hosted auth remain unqualified. The signed-in UI presents account status only.
The [PASS 11B contract](../frontend/pass11b-implementation-plan.md) covers
known-ID reads, missing listing/history APIs and requirements for protected
browser mutations. PASS 11B implementation has not begun.
