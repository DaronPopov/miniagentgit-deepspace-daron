# PASS 12B baseline

Local and remote GitHub `main` matched
`c8030ebc89b2cb2209e640f5cc9584e97963f9a5`. The worktree was clean.
The locked SDK and installed CLI were DeepSpace 0.44.2. Node 24.18.0
and npm 11.16.0 were used.

The authenticated production CLI confirmed the existing assigned application
`app_01M7N6X263TDDC26Y59Q1RK23P`, GitHub source authority, historical
release sequence 1 and `serving: false`. The Free account reported
500 allocated, 499.9977692 remaining and 0.0022308 used. There was no
authorization to deploy during this pass.

The baseline application checked user JWTs on REST and scoped credentials
on agent tools. Canonical repository owners reverified the original bearer.
Per-repository storage, commit and CI admission bounds existed. Public
routing had no app-wide rate, concurrency or distinct repository limit.
A valid account could cause more owner allocations by changing keys and IDs.
The CI parser used bounded source and AST inputs. Its synchronous call lacked
a verified hard CPU/memory boundary.

Reviewed PASS 12A's results, quota and recovery decisions, authentication
and tool documentation, dependency audit, parser qualification, Worker
and owner route assembly, SDK transport ordering, repository storage,
test fixture and Vite build declarations. The PASS 12A local baseline
reported 198 tests and production Worker/client JS/CSS of
1,522,527 / 436,826 / 15,305 bytes. The blocked production guarantees were
canonical ingress, billing, effective runtime limits and non-destructive
recovery. [PASS 12A decision](pass12a-results.md)
