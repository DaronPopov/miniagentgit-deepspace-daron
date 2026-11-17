# PASS 06F: first deployment

## Git and application identity

Starting main SHA: `0b513be49cecc8297d9caab2601455bd12f793f7`; worktree was clean.
The final SHA is the standalone commit containing this report, obtainable with
`git log -1 --format=%H -- docs/passes/pass06f-results.md` and reported at delivery.

- Public app ID: `app_01M7N6X263TDDC26Y59Q1RK23P`.
- URL: https://miniagentgit-deepspace-daron.app.space
- Release: `rel_01M7N72AKFS80MH2K7PRXMWR62` (sequence 1).
- Exactly one registration and one deployment; no second app or deployment.
- Source authority: GitHub `daronpopov/miniagentgit-deepspace-daron`.
- CLI reported `serving: confirmed`, `dataPlane: unverifiable`, retained bundle.
  Our separate real repository/CI smoke below establishes the tested data path;
  it is not a universal platform lifecycle guarantee.

Deployment shipped the validated working tree before this final evidence commit.
Consequently the release has `sourceDirty: true`, `commitOid: null` and
`recoverable: false` in deploy output, while the release listing reports
`rollbackAvailable: true`. Do not misrepresent this as a clean commit-addressed
release or a tested rollback. The final commit preserves the deployed production
source; subsequent changes were documentation and one extra redirect test only.
Final rebuilt worker SHA-256:
`8a069bd096e3c6d9ebcb15ce9dfe3dc677ba24289920cc4101ce0f085359ee7d`.
Client chunk names/sizes remained identical to the deployed build. No extra
deployment was made merely to change release metadata.

## Free-tier safety gate

Inspected installed CLI/SDK 0.44.2, Node 24.18.0, npm 11.16.0, official deployment,
authentication, testing and file-storage documentation. `auth whoami` and
`status --json` identified the intended existing developer account on the
production service plane. Initial `app list --json` returned no apps and the
project had no assigned ID. `app usage --json` reported Free tier, 500 allocated /
500 available / 0 used credits, no purchased or bonus credits. The official public
site describes free building/deployment; registration/deployment accepted this
account without an upgrade or purchase. No universal future pricing guarantee
is inferred from that acceptance.

`deepspace app init --json` assigned the ID above once. Rechecking the app list
showed exactly that intended app. `secrets configs create prd --json` created the
required empty config; masked `secrets list --json` reported no user secrets.
No billing setting, payment declaration, auto-upgrade, paid integration, external
service or auto-provisioned resource was added. All seven existing DO manifest
entries and canonical repository ownership were preserved.

After deploy and smoke, credits still showed 500 available / 0 used, with no
integration ledger entries. This is a point-in-time observation, not proof of
zero delayed/future hosting cost. Deployment uploaded ten client assets (about
421 KiB) and retained its rollback bundle. `app files list --limit 1 --json`
reported 0 user-file bytes and a 1,073,741,824-byte app file limit. The current
[files guide](https://docs.deep.space/agents/add-file-uploads-to-a-web-app) describes
128 MiB on Free; retain our conservative 128 MiB planning budget despite this
discrepancy. Neither value establishes SQLite, DO, CPU or request quotas.
No spending-cap/automatic-upgrade control was exposed in the inspected CLI usage
and help surfaces. No setting was changed and no extra credits were purchased.
Cloud tests were small functional checks, not polling/load/stress workloads.

## Source changes and authentication wiring

- `wrangler.toml`: actual assigned app ID and confirmed public JWT audience.
- `src/server/deepspace/managed-auth.ts`: browser-only official scaffold subset,
  116 physical LOC, retaining the ordinary 185-line ceiling.
- `src/server/app.ts`: mount auth routes before the existing API fallback.
- `src/features/auth-ui/sdk.ts`: use the installed AuthOverlay's managed redirect
  pattern rather than a direct Better Auth social POST.
- `tests/managed-auth.test.ts`: five focused route/redirect/security tests.
- README, authentication architecture, API, architecture and free-tier evidence
  updated. No dependencies, lockfile changes, new LOC exemptions or backend
  persistence/CI/concurrency changes.

Verified APIs: `authWorkerFetch`, `SESSION_COOKIE`, `readBoundedBodyText`,
`BodyTooLargeError` from `deepspace/worker`; existing provider/hooks,
`getAuthToken`, `clearAuthToken`, `signOut` remain. The 0.44.2 official
create-deepspace HTTP scaffold and SDK AuthOverlay implementation were inspected.

The mounted browser routes are GET `/api/auth/social-redirect`, GET
`/api/auth/oauth-complete`, POST `/api/auth/sign-out`, GET
`/api/auth/get-session`, POST `/api/auth/token`, and GET `/api/auth/ok`.
Provider names are finite; POST origins must match; token request bodies are
bounded at 8 KiB. Managed code exchange sets the official session cookie with
HttpOnly/Secure/SameSite=Lax and redirects to `/dashboard`. Proxy responses strip
upstream cookie Domain attributes and prevent caching. Sign-out always expires
the app cookie even on upstream failure. No native auth, integration proxy,
generic record mutations, custom OAuth/token issuer or credential bypass exists.

The platform supplies `AUTH_JWT_PUBLIC_KEY`, `AUTH_JWT_ISSUER` and
`AUTH_WORKER_URL`. Its published JWKS was retrieved over HTTPS. SDK verification
of an existing platform-issued token confirmed issuer
`https://auth.deep.space/api/auth` and audience `https://api-worker.deep.space`;
the latter is now a public Wrangler var. Hosted token exchange and `/api/me`
confirmed compatibility. Verification and owner checks were not weakened.
No credentials, cookies, private keys or token responses were written to Git.

## Local quality gate

`npm ci`: passed (462 installed, 463 audited; one existing low-severity audit
finding; no unrelated dependency update).

`npm run validate` passed completely after registration and auth wiring:

| Command                        | Result                                                   |
| ------------------------------ | -------------------------------------------------------- |
| `npm run type-check`           | pass                                                     |
| `npm run lint`                 | pass                                                     |
| `npm run format:check`         | pass                                                     |
| `npm run check:ci-fingerprint` | pass, unchanged                                          |
| `npm run check:size`           | 161 tracked source files, zero violations                |
| `npm test`                     | 45 suites, 137 tests passed                              |
| `npm run build`                | official Vite Worker and client production builds passed |

The app-ID build guard remains intact and succeeds with the real registered ID.
Vite 8.3.8 produced Worker JS 831.41 kB (gzip 200.20 kB), client entry JS
315.12 kB (gzip 99.96 kB), lazy auth/dashboard shell 55.00 kB (gzip 19.02 kB),
docs chunk 16.17 kB (gzip 6.05 kB), and CSS 10.86 kB (gzip 2.32 kB).
These are official build output decimal sizes, not heap or request budgets.

## Deployment and hosted evidence

Official command: `npx --no-install deepspace deploy --no-push --json`.
It preserved GitHub as source authority and did not invoke DeepSpace source push.
Registration command: `npx --no-install deepspace app init --json`.
Account/app checks used `auth whoami`, `status --json`, `app list --json`,
`app usage --json`, `secrets list --json`, `releases --limit 1 --json`,
`app source --json` and `app files list --limit 1 --json`.

Temporary Node/Chrome smoke scripts lived outside Git, retained only sanitized
status metadata and were not shipped. Headless Chrome visited actual hosted
pages and production assets, not a local substitute. It observed:

- Homepage 200; hero renders at 1440px; documentation link navigates client-side.
- `/docs` 200, 24 code/copy panels render at 390px without page overflow.
- `/dashboard` 200, managed get-session succeeds, signed-out controls render at
  390px; no horizontal overflow, failed asset responses or JS exceptions.
- Public homepage/docs initialization makes no protected/auth requests.
- Hosted GitHub sign-in entry responds 302 to the real managed auth origin with
  the app's exact origin as returnTo. No arbitrary return URL is accepted.

A separate bounded Node smoke exchanged the **existing OAuth-authenticated
session** through hosted POST `/api/auth/token`, then used the issued JWT as
Bearer credentials. It did not treat CLI login alone as an API credential and
never sent a synthetic identity header. Results:

| Operation                                             | Hosted result                          |
| ----------------------------------------------------- | -------------------------------------- |
| `/api/health`, public pages                           | 200                                    |
| `/api/me` missing token / invalid token               | 401 / 401                              |
| Managed session-to-JWT exchange                       | 200                                    |
| `/api/me` issued JWT                                  | 200, verified user                     |
| Create one tiny private repository                    | 200                                    |
| Initial immutable `README.md` commit (15 UTF-8 bytes) | 200                                    |
| HEAD, commit metadata, file retrieval                 | 200, matching committed identity/text  |
| Repeat exact commit key/payload                       | 200, same commit, HEAD version stays 1 |
| Request commit-addressed CI                           | 202, durable queued job                |
| Read job status and receipt                           | 200, passed, receipt schema 1          |
| HEAD after CI                                         | identical commit ID and version        |

Two initial smoke-harness assertions incorrectly expected file retrieval to
return an object instead of the implemented string. Correcting the external
harness resolved that assertion; the application was not changed or redeployed.
The same creation/commit keys were reused, so these attempts retained only one
repository and one 15-byte commit rather than duplicating history. CI required
one status and one successful receipt observation; no high-frequency polling.
The tiny smoke records remain as owner-private durable data; no deletion feature
or cleanup bypass was introduced.

## Remaining qualification and manual actions

A fresh interactive Google/GitHub OAuth round trip and browser sign-out were
requested from the user but not observed by the agent at report time. Hosted
session exchange/JWT/API verification is real; it is not proof of that fresh
browser flow. Callback cookie handling and sign-out failure cleanup are locally
tested. The isolated Chrome browser verified only signed-out hosted state.
Do not claim complete interactive browser authentication qualification yet.

No usable independent hosted test accounts were available (`test accounts list
--usable --json`: zero). No test account was created. Hosted cross-user isolation
therefore remains unverified; the existing Alice/Bob/Charlie local workerd/SQLite
isolation and attack tests still pass. Provider revocation, multi-region rollout,
shutdown/recovery extremes and physical/billing quotas are not established by
this small smoke. Account-wide rate/cardinality admission is still absent.

To finish interactive qualification, visit `/dashboard`, complete managed provider
sign-in, confirm the verified subject appears, then sign out and confirm protected
state disappears. Never paste session cookies or JWTs into chat. The public guide
retains earlier conservative local-only qualification copy; this report is the
current hosted evidence, not a claim of a full dashboard or hosted multi-user test.

PASS 06E, PASS 07, MCP and JobRoom migration were not started.
