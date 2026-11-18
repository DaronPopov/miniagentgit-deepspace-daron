# PASS 11B browser qualification

The PNGs and [inspection summary](inspection.json) cover 1440×1000 and
390×844 in light and dark on Linux with Chrome 155.0.8059.79 and Microsoft
Playwright MCP 0.0.85. Compare the public layouts with the
[PASS 11A foundation captures](../pass11a/README.md). PASS 11A's dashboard
ended at account identity. PASS 11B adds the repository and CI panels.

From the project root with Node 24, npm, Chrome and Python installed:

```sh
npm ci
npm run build
python3 scripts/smoke-dashboard.py test-results/pass11b
```

On Windows, use `py -3` in place of `python3`. The qualification ran on Linux.
The script owns the ephemeral loopback workerd preview, stdio MCP process,
isolated Chrome profile and scratch directory. The MCP code tool executes
only the checked-in test scenarios, using a loopback-only application URL.
The run saves selected DOM and network observations and screenshots to the
output directory. Keep live credentials and unrelated profiles outside this
workflow. See the [tooling assessment](../../agent-ui-tooling.md).

The four scenarios use actual managed session exchange and signed
`/api/me` verification against the Worker. The dashboard reads empty and
populated repositories, parent commit details, paginated trees, inert text
previews, paginated jobs and real failed and passing receipts. An obsolete
read is held while switching repositories. A recorded real pending response
is replayed for the first browser receipt request, and refresh retrieves the
durable failed receipt directly. Foreign ownership and missing repository
requests hit the real API. Sign-out and browser-clock session expiration clear
rendered protected data.

The known 401, 403, 404 and 409 are listed as expected outcomes. One existing
Chrome warning about the obsolete `document-domain` Permissions-Policy
feature repeats on document loads. The header is inherited from PASS 11A.
The runner rejects other console diagnostics and network failures, except
aborted obsolete requests. Checks include semantic main landmarks and H1,
visible keyboard skip focus, labeled form actions, announced loading
states and viewport width. The older onboarding smoke separately tests
radio keyboard behavior, command copying and four widths in both themes.
