# PASS 12D dashboard verification

**Local browser PASS. Hosted dashboard unverified.**

Ran `python3 scripts/smoke-dashboard.py /tmp/mini12d/browser` against the
production build through the pinned Playwright MCP 0.0.85 harness. Desktop
1440 × 1000 and mobile 390 × 844 passed in light and dark, with 48 screenshots
and a structured inspection report in the local output directory.

The independent browser fixture exercised dashboard identity, empty and
populated HEAD, immutable parent and file views, CI states and receipts,
foreign-owner and missing repository handling, session expiry and cleanup.
The browser matrix used its own deterministic repository fixture. The Codex
run's repository was qualified through native MCP in a separate preview.
Hosted OAuth, hosted dashboard evidence, and browser inspection of the
specific Codex-created repository remain unverified.
