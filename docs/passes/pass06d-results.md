# PASS 06D results

## Baseline and delivery

Starting main SHA: `81c4c8ce8fb3cad5ac90b32ce07c22afa6246425`. Initial worktree
was clean. PASS 06C was inspected and preserved. This report belongs to the
standalone PASS 06D commit; obtain its exact final SHA with
`git log -1 --format=%H -- docs/passes/pass06d-results.md` (also reported at delivery).
No registration, deployment, cloud test or credit-consuming operation occurred.
No dashboard data functionality or PASS 06E work was implemented.

## Implementation and changed files

- `src/features/auth-ui/`: contracts, SDK boundary, configuration guard, session
  normalization, shell/controls, route session lifecycle, bounded credential
  acquisition, protected-read client and request pipeline, scoped CSS.
- `src/pages/dashboard.tsx`: thin protected shell composition.
- `src/server/app.ts`: exact dashboard static-shell asset mapping only.
- `src/styles.css`: scoped auth stylesheet import.
- `tests/auth-{boundaries,client,render,sdk-credential}.test.ts`: frontend import,
  session, credential, rendering and real SDK credential/verification tests.
- `tests/tenant-{fixture,isolation.test,attacks.test,concurrency.test}.ts` and
  `tests/identity-fixture.ts`: three controlled subjects, actual authenticated
  APIs, canonical rooms, persisted ownership, attacks and independent scheduling.
- README, architecture, API, product-site and free-tier documentation updated;
  `docs/authentication-architecture.md` added.

Backend JWT verification, canonical routing, repository owner authorization,
SQLite transactions, commit scheduler, HEAD and CI implementation are unchanged.
No LOC exceptions or dependency changes; package.json and lockfile are unchanged.

## Verified SDK boundary

Installed `deepspace@0.44.2` declarations and implementation were inspected,
alongside the official authentication guide and `create-deepspace@0.44.2` HTTP
scaffold. Actual APIs: `DeepSpaceAuthProvider`, `useAuth`, `useSession`,
`signIn.social({provider, callbackURL})`, `signOut`, `getAuthToken`,
`clearAuthToken`; server `verifyJwt` remains the existing implementation.
The provider is mounted only on the protected route after the registration guard.
Browser session cookies are not treated as API JWTs or ownership claims.

The route shell handles loading, signed-out, signed-in, expired, generic error,
credential-unavailable and configuration-unavailable states. Only server-verified
identity is presented as signed in. Session/account changes abort requests and
fence stale results; sign-out clears protected state before the SDK call and
reloads the public page. There is no protected cache or credential persistence.
Token acquisition is coalesced and bounded; protected reads have deadlines,
retained execution slots, same-origin path restrictions and an identity probe.

## Validation commands and outcomes

- `npm ci`: passed; 462 packages installed, 463 audited, one existing low-severity
  audit finding. No dependency updates were made to address unrelated findings.
- `npm run validate`: type-check, lint, formatting, CI fingerprint, source-size
  check and all tests passed; final production build stopped at the known app-ID
  guard. The constituent commands are `npm run type-check`, `npm run lint`,
  `npm run format:check`, `npm run check:ci-fingerprint`, `npm run check:size`,
  `npm test`, `npm run build`.
- Source size: 159 tracked TS/TSX files, zero violations; ordinary modules and all
  tests retain 185 LOC. Import boundary and cycle tests pass.
- Full tests: **44 suites, 132 tests passed** (previous baseline 37/114).
- `npx vitest run tests/tenant-isolation.test.ts tests/tenant-attacks.test.ts tests/tenant-concurrency.test.ts`:
  **3 suites, 3 tests passed**. These are comprehensive scenario tests rather than
  counting each route assertion as a separate test.

Alice and Bob create and concurrently commit to their own repositories; Alice
also creates multiple repositories. Alice/Bob/Charlie cross-owner matrices deny
metadata, HEAD, commit creation/details, tree/files, replay, CI admission/status,
receipts/listing/cancellation. HEAD remains unchanged after denied requests.
Foreign job/commit IDs cannot bypass room authorization. Expected-HEAD competitors
produce one success and one conflict. Restarted workerd retains owners, commits
and CI receipts; canonical routing is stable and foreign owners remain denied.
A separate real SQLite test holds Alice's executor before transaction entry while
Bob completes, demonstrating independent repository scheduling.

Attack coverage includes missing/malformed/expired JWT, invalid signature,
incorrect issuer/audience, forged subject headers/owner claims, unauthenticated CI
and absent trusted configuration. Controlled ephemeral signing keys stay in test
fixtures, never frontend assets. These use real SDK verification and actual local
workerd/SQLite, not mocked successful database transactions.

## Browser evidence

Temporary Chrome 155 loopback fixtures used existing esbuild and CDP, with no new
browser framework or production app-ID substitution. All fixtures/servers were
stopped and temporary build directories removed.

- Actual unregistered dashboard at 320, 390, 768 and 1440px: unavailable state,
  no protected requests, no horizontal overflow or runtime errors, visible 3px
  keyboard outline and working skip link.
- Public `/docs` at the same widths: all 24 code panels/copy controls present,
  exact placeholder-preserving clipboard copies, no clipped buttons or page
  overflow, no auth/protected requests and no runtime errors.
- A separate controlled-session fixture mounts the real SDK provider/hooks and
  AuthSession directly. Its local token endpoint supplies ephemeral signed test
  JWTs; `/api/me` uses the actual Hono principal route and SDK verifier. Alice's
  identity is verified, SDK session refetch switches to Bob without displaying
  Alice, sign-out clears Bob and reloads, and provider sign-in failure is generic.
  At 390px there is no overflow, credential text or runtime exception.
- Local minified fixture sizes: dashboard JS 290,802 bytes / CSS 10,802 bytes;
  docs JS 248,677 bytes / CSS 10,802 bytes. These are standalone esbuild fixtures,
  not production Vite bundle evidence or an incremental bundle comparison.

Node rendering/contract tests additionally cover all status states, controls,
expiration, denied token acquisition, SDK failure, request bounds, late responses,
account switching, no token rendering, public routes and narrow import boundaries.
Controlled browser sessions do not establish managed hosted OAuth functionality.

## Production build and qualification limits

`npm run build` fails solely at the unchanged official prerequisite:
`[vars] has no valid DEEPSPACE_APP_ID (found "__APP_ID__")`. No ID was fabricated
and the guard was not weakened. There is no production bundle/deployment claim.

Hosted login is **not operationally qualified**. In addition to registration,
the Hono application still lacks the official managed `/api/auth/*`
proxy/cookie/callback wiring, and actual public key/issuer/audience compatibility
is unknown. These endpoints currently return 404. The secure unavailable shell
is the supported current application behavior; local fixtures do not fill those
production configuration gaps. Future hosted qualification requires separate
explicit authorization. SDK sign-in methods are integrated but actual OAuth
redirects, managed cookies, issuance and revocation remain unverified.

Owner-only isolation is locally verified; collaborative ACLs are deferred.
Sign-out is not an immediate server-side JWT revocation guarantee. Account-wide
rate/cardinality/resource quotas remain unresolved; multiple rooms share one
application's allowance. No per-user billing allocation is claimed. See
[authentication architecture](../authentication-architecture.md) for AUTH-001–010.

The read-only dashboard can build on these local contracts in a later pass;
production login must remain unavailable until its hosted prerequisites are
established. PASS 06E was not started.
