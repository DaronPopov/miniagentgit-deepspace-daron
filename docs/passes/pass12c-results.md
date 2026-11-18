# PASS 12C results

**Engineering evidence · PASS. Hosted decision · NO-GO.** MiniAgentGit
cannot yet be safely deployed on the assigned DeepSpace Free production
slot for a real JWT-authorized coding-agent MCP test. The existing app
remains undeployed.

- Starting local and remote `main`: `6e0a13b83a5d90f0c971e0218bc98d984d8e4afc`.
  The worktree started clean. The final documentation commit is identified
  by `git log -1 --format=%H -- docs/passes/pass12c-results.md`.
- Production app `app_01M7N6X263TDDC26Y59Q1RK23P` retained GitHub source,
  historical release sequence 1, zero routes and `serving: false`.
- Free account before and after: 500 allocated, 499.9977692 remaining and
  0.0022308 used. No deployment, purchase, secret change, restore or data
  deletion occurred.
- DeepSpace feedback report `8934f453-b71a-4dfb-bcac-54749cab8b48` was
  accepted November 18, 2026 at 14:12:44 UTC. Its receipt reported `open`
  with no provider response. [Channel verification](../security/deepspace-platform-guarantees.md#pass-12c-escalation)

Only evidence and operational documentation changed. The existing approved
subjects, admission ledger, JWT policy, tenant authority, pipeline fingerprint,
class manifests, migration tags and lockfile remain the candidate. No
production integration, safety or cost contract was inferred from generic
upstream platform limits.

## Regression and recovery

| Check                                           | Actual result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm ci` and `npm run validate`                 | Passed under Node 24.18.0, npm 11.16.0 and DeepSpace 0.44.2. 205 passing tests in 75 files, four opt-in skips by default, 240 checked tracked source files, official production build. Matches PASS 12B.                                                                                                                                                                                                                                                                                                     |
| Five opt-in tests                               | Passed with the existing stage restart, stage deadline and parser corpus environment flags and `--maxWorkers=1`.                                                                                                                                                                                                                                                                                                                                                                                             |
| JWT, MCP, tenant, global admission and recovery | 24 passing tests across 11 files. Includes real local workerd and ephemeral signed credentials.                                                                                                                                                                                                                                                                                                                                                                                                              |
| Parser process corpus                           | 40 fixtures × three samples, zero unexpected outcomes. Observed process maxima 19.66 ms wall, 39.67 ms CPU and 76,764 KiB peak RSS. Hosted hard limits and forced termination remain unverified.                                                                                                                                                                                                                                                                                                             |
| Local recovery                                  | Exact 12-response digest matched before/after fresh restore. Foreign-owner denial and replay passed. Sample CI fixture 505 ms; backup, restart, restore and API verification 482 ms. [Digest and boundary](../operations/pass12c-production-recovery.md)                                                                                                                                                                                                                                                     |
| Browser matrix                                  | Playwright MCP passed 1440×1000 and 390×844 in light and dark. Existing onboarding smoke passed eight combinations. Local artifacts were generated in `test-results/pass12c`. No hosted browser test ran.                                                                                                                                                                                                                                                                                                    |
| Production assets                               | Worker JS 1,531,062 bytes, client JS 436,826 and CSS 15,305. Worker syntax check passed. No production upload.                                                                                                                                                                                                                                                                                                                                                                                               |
| Dependencies                                    | Registry latest picomatch 4.0.7 remains affected. esbuild 0.28.2 includes the fix but DeepSpace 0.44.2 requires ^0.27.0 and the locked root build tool is 0.27.7. No compatible complete narrow fix was established. Audit exits 1, with 16 full and six production-filtered package findings from the unchanged two advisory identities. Signatures and tree checks passed, with 462 registry signatures and 166 attestations. [Existing reachability assessment](../security/pass12b-dependency-review.md) |

## Decision

DeepSpace must confirm and support canonical ingress and its reject metering,
hard Free exhaustion/financial exposure, independently enforceable parser
containment or an equivalent verified production limit, and non-destructive
suspension and custom SQLite restore. App admission happens after ingress.
Neither a custom-domain proxy, quota estimate, JavaScript timer nor local
backup can close those gaps. The operator must review the resulting
financial/exposure boundary and authorize a later deploy separately.

[Gate matrix](pass12c-deployment-gates.md) ·
[Financial boundary](../security/pass12c-financial-boundary.md) ·
[Ingress](../security/pass12c-ingress-qualification.md) ·
[Parser](../security/pass12c-parser-containment.md) ·
[Recovery](../operations/pass12c-production-recovery.md) ·
[PASS 12D handoff](pass12c-pass12d-handoff.md)
