# PASS 11A browser evidence

All runs used Playwright MCP 0.0.85 and Chrome 155.0.8059.79 on Linux.
Images are light-theme viewport captures at 1440×1000 and 390×844 CSS pixels.
URLs and credentials are excluded from screenshots. Inspection summaries
use relative paths and record console counts, landmarks, overflow, labels,
fragment targets, focus and verified session transitions. The account contains
only the fixed test subject.

- [Baseline screenshots and inspection](baseline/) came from the official build
  of `72538b6f67e94aef217315d43406450607a79c3b`. They cover landing, docs,
  signed-out entry, signed-in dashboard, missing route and unauthorized identity.
- [Baseline auth failure](baseline-failure/) has the account screenshots and
  the corresponding inspection with the fixture turned off.
- [Foundation screenshots and inspection](foundation/) repeat the matrix after
  the design foundation. [Foundation auth failure](foundation-failure/) includes
  the updated failure styling.

The browser workspace only stored PNGs and selected inspection summaries.
The matrix also accessed accessibility snapshots during the run. It closed
Chrome and discarded its scratch directory and automatic snapshots. The failure
directories retain their two unique screenshots. See the
[PowerShell and Linux reproduction procedure](../../agent-ui-tooling.md).

A local sign-in fixture exchanged a test code via the built Worker's callback,
then exercised session reads, token exchange and `GET /api/me` under the actual
JWT verifier. Sign-out returned the user to the signed-out state. The managed-auth unit
tests assert the app cookie expiration response. The provider OAuth UI and real credentials were outside the
fixture. The signed-in screenshots show only the current account shell.

Expected response errors are the unknown route's 404, unauthenticated identity
401 and managed-auth 503 in the unconfigured preview. The baseline's
`HydrateFallback` warning appeared on direct loads of the valid client routes.
The foundation supplies a status fallback for lazy route initialization.
