# PASS 12D deployment evidence

On November 18, 2026, clean local `main` and GitHub `main` both resolved to
`de30bfc3f849530fb2e97e234050332a45ad3cf1`. Authenticated DeepSpace CLI
0.44.2 status, application list and account usage resolved the existing app
`app_01M7N6X263TDDC26Y59Q1RK23P`, GitHub source
`DaronPopov/miniagentgit-deepspace-daron`, owner role, zero routes, null live URL,
`serving: false` and `undeployed`. The existing release event had sequence 1
and no Git commit attached. It predates this pass.

The Free ledger reported **499.9977692 of 500** credits remaining, with zero
purchased and bonus allocations. The presence of a secrets store is metadata
only. Production secret values and issuance were not inspected.

The build produced 1,531,062 bytes of Worker JavaScript, 436,826 bytes of client
JavaScript and 15,305 bytes of client CSS. The largest client asset was 315,344
bytes. The local build fits the previously documented 25 MiB per-file asset
limit. No production upload or provider acceptance check was performed.

No deployment ID, deployed SHA, hosted origin, hosted request latency or
hosted consumption exists for this pass. [Official deployment contract](https://docs.deep.space/concepts/deployment.md)
