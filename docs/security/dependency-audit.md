# Dependency security audit — PASS 08A.1

Assessment date: 2026-11-17. Source authority: GitHub
`DaronPopov/miniagentgit-deepspace-daron`, branch `main`. Starting HEAD:
`c29505bc03d9d1d4c4323696aa31402cd24a080f`; initial worktree clean.
The application remains undeployed. No platform/account requests, registration,
deployment, secret changes, external scanning uploads or credit workloads ran.

## Decision and scope

The original **16 npm package findings (15 high, 1 low) represent two distinct
advisories**, not sixteen independent vulnerabilities. Both remain in the locked
installation. Neither vulnerable package/code path is shipped in the inspected
production Worker or browser JavaScript. **Zero credible P0/P1 dependency
exposures were identified** in this architecture. This is a scoped dependency
assessment, not a clean audit or general production-security certification.

No dependency, override, application source, CI policy, credential admission,
MCP behavior, ownership, engine requirement or configuration changed. No safe
compatible published resolution clears either advisory: picomatch has no patch;
esbuild's patch crosses the SDK's declared range. Retaining and documenting the
findings is preferable to downgrading the framework or forcing its dependencies.

## Reproduction and evidence

Environment: Linux x64, Node **24.18.0**, npm **11.16.0**, lockfileVersion 3.
Engines remain `>=22.15.0 <23 || >=24 <25 || >=26 <27` and npm `>=11.6.0`;
packageManager remains `npm@11.16.0`. Registry: `https://registry.npmjs.org/`.

Run from the repository root with supported Node/npm:

```sh
npm ci
npm audit --json > /tmp/miniagentgit-audit.json
# Expected exit 1; continue and retain the JSON report.
npm audit --omit=dev --json > /tmp/miniagentgit-audit-production.json
# Expected exit 1; continue and retain the JSON report.
npm ls --all > /tmp/miniagentgit-npm-ls.txt
npm outdated --json > /tmp/miniagentgit-outdated.json
# Expected exit 1 when newer packages exist.
npm audit signatures
npm run validate
```

Each report was captured independently, with exit status retained. Baseline and
final audits both exit 1 with identical advisory identities and counts; `npm ci`,
`npm ls --all` and signature verification exit 0. `npm outdated` exits 1.
Registry advisories and dist-tags can change without a lockfile change.

Committed baseline evidence in [evidence/pass08a1](evidence/pass08a1/):
[full audit](evidence/pass08a1/audit.json),
[production-filtered audit](evidence/pass08a1/audit-production.json),
[complete installed tree](evidence/pass08a1/npm-ls.txt),
[outdated snapshot](evidence/pass08a1/outdated.json), and
[production bundle module inventory, hashes and bytes](evidence/pass08a1/bundles.json).
Reports contain dependency metadata, not private application source or secrets.
[Final full audit](evidence/pass08a1/audit-final.json) preserves the second report.
Its only differences are npm's propagated `effects` bookkeeping: the eslint-plugin
edge moves from parser to type-utils. Advisory identities, affected nodes,
versions, ranges, fix proposals and counts are unchanged. The production-filtered
JSON is identical, so it is stored once.

Unchanged SHA-256 identities:

| Input                          | SHA-256                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| package.json                   | `02cf22d35c107b3d533d043765164fb86ba553ee64dcfe8115efbfe4325539d1` |
| package-lock.json              | `768c1cda3a1d5d0a45ccda508362672b611b20681009e89919bf3070bed02a37` |
| SDK dist/worker.js             | `9505d94f5c3f2778174085ae645324184b30e6cbd9758e7de6f6d5e6876c37b3` |
| src/ci-source-fingerprint.json | `fd82728ea680a5e659847b5d297233ff33799c7710c6cb288fa0acbdc31ade11` |

## Distinct advisory findings

Priority means project exposure, independently of npm severity. P0 is credible
critical remote production exposure; P1 is plausible shipped/reachable production
risk; P2 is build/development supply-chain risk; P3 is currently low exposure or
inapplicable functionality. Confidence concerns current source/build evidence,
not an assurance about future SDK versions or deployments.

| Package                   | Advisory                                                                                   | npm severity | Exposure                                                                                             | Project priority                                                       | Remediation                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------ | ------------ | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| picomatch 2.3.2 and 4.0.7 | [GHSA-fc5q-39xc-vjpf / CVE-2026-112366](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) | high         | Build, route generation, lint and test glob matching; absent from shipped JS                         | P2, high confidence                                                    | Deferred: advisory affects `<=4.0.7`; registry latest 4.0.7; no patched release listed      |
| esbuild 0.27.7            | [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr)                   | low          | Windows development server with servedir; current Linux build/test callers use build APIs, not serve | P3 currently, high confidence; P2 if that Windows server is introduced | Deferred: affected `>=0.27.3 <0.28.1`; patched 0.28.1, latest 0.28.2; outside SDK `^0.27.0` |

### Picomatch: trigger, boundary and impact

The advisory describes repeated extglob patterns causing exponential regex
backtracking and blocking the Node event loop. Exploitation requires attacker
influence over glob patterns and matching input. A malicious configuration or
repository checkout processed by Vite/Vitest/ESLint/Generouted is a plausible
**build/development denial-of-service** scenario. That is not a demonstrated
attack against this application's hosted API. No dangerous pattern was executed.

Confirmed installed reachability is through development tools, using checked-in
configuration: `vite.config.ts`, `vitest.config.ts`, `eslint.config.js` and
Generouted's route-discovery plugin. Generouted uses fast-glob; tinyglobby/fdir
and Vite/Vitest use picomatch 4. Arbitrary dependency install/build code is a
separate pre-existing supply-chain trust boundary, not evidence that this ReDoS
advisory permits code execution or package compromise.

An unauthenticated Hono, auth or agent/MCP request cannot select a build glob.
An authenticated repository owner can submit bounded text/path data, but
`src/application/ci/validation.ts` hashes/scans immutable snapshots using fixed
server logic; it never loads submitted configuration/plugins or invokes these
tools. CI generation fencing and repository ingestion do not create an edge into
picomatch. GitHub validation processes a source checkout and dependency scripts;
it does not execute the hosted repository contents stored in SQLite.

No evidence supports RCE, authentication bypass, cross-user disclosure, secret
exfiltration or HEAD mutation from this advisory here. Availability loss in a
build environment is plausible, not reproduced. Hosted Worker and public assets
lack the matcher code, supporting high confidence in current nonexposure.

### Esbuild: trigger, boundary and impact

The advisory concerns Windows path normalization in esbuild's development HTTP
server when `servedir` is configured. A crafted request can escape the served
root and read files accessible to that developer process, potentially including
secrets. It requires a developer to run that server and an attacker able to
reach it. It does not describe RCE, authentication bypass or a bundling defect.

The current environment and GitHub validation are Linux. Project callers in
`tests/worker-fixture.ts`, `tests/public-boundaries.test.ts` and
`scripts/measure-public-bundle.mjs` invoke `build`, not `context.serve`.
Installed `deepspace/dist/cli.js` invokes `build` for local Worker bundling;
`dist/documentation.js` imports `buildSync`. Neither SDK Worker nor browser entry
imports esbuild. Cloudflare/Wrangler's separate esbuild copies are already
**0.28.2**, outside the affected range. Vite's dev server is not proof of use of
esbuild's own vulnerable `servedir` server.

Thus no current affected server is demonstrated; no remote Hono/JWT/MCP or
repository-content route reaches it. Windows esbuild serving remains a conditional
local secret-disclosure risk. Avoid introducing that invocation until the SDK can
use a patched version; this recommendation is not a newly enforced control.

## All sixteen npm entries and dependency paths

`A` below means the picomatch GHSA above; `B` means the esbuild GHSA. Propagated
entries have **no additional independent advisory**. Every row is present in the
full audit. “Prod” means also reported by `--omit=dev`, not Worker/browser runtime.
All sixteen entries' vulnerable functionality is absent from both shipped graphs.

| npm entry                            | Installed version            | Direct?                         | Prod audit? | Underlying advisory and immediate dependency chain           |
| ------------------------------------ | ---------------------------- | ------------------------------- | ----------- | ------------------------------------------------------------ |
| @generouted/react-router             | 1.20.3                       | dev direct                      | no          | A → fast-glob → micromatch → picomatch 2                     |
| @typescript-eslint/eslint-plugin     | 8.73.0                       | transitive                      | no          | A → parser/type-utils/utils → typescript-estree → tinyglobby |
| @typescript-eslint/parser            | 8.73.0                       | transitive                      | no          | A → typescript-estree → tinyglobby                           |
| @typescript-eslint/type-utils        | 8.73.0                       | transitive                      | no          | A → typescript-estree/utils → tinyglobby                     |
| @typescript-eslint/typescript-estree | 8.73.0                       | transitive                      | no          | A → tinyglobby → picomatch 4; fdir peer                      |
| @typescript-eslint/utils             | 8.73.0                       | transitive                      | no          | A → typescript-estree → tinyglobby                           |
| @vitejs/plugin-react                 | 6.3.0                        | dev direct                      | no          | A → Vite peer → picomatch 4/tinyglobby                       |
| esbuild                              | 0.27.7                       | dev direct, also SDK transitive | yes         | B; root and deepspace → esbuild                              |
| fast-glob                            | 3.3.3                        | transitive                      | no          | A → micromatch → picomatch 2                                 |
| fdir                                 | 6.5.0 under tinyglobby       | transitive                      | yes         | A → picomatch 4 optional peer                                |
| micromatch                           | 4.0.8                        | transitive                      | no          | A → picomatch 2                                              |
| picomatch                            | 2.3.2; three copies of 4.0.7 | transitive                      | 4.x only    | A, direct advisory; exact nodes below                        |
| tinyglobby                           | 0.2.17                       | transitive                      | yes         | A → picomatch 4 and fdir                                     |
| typescript-eslint                    | 8.73.0                       | dev direct                      | no          | A → plugin/parser/estree/utils → tinyglobby                  |
| vite                                 | 8.3.8                        | dev direct, peer/transitive     | yes         | A → picomatch 4 and tinyglobby                               |
| vitest                               | 4.1.12                       | dev direct, optional peer       | yes         | A → picomatch 4 and tinyglobby                               |

Picomatch nodes are `node_modules/picomatch` (2.3.2), and
`node_modules/{tinyglobby,vite,vitest}/node_modules/picomatch` (4.0.7).
The root lockfile marks esbuild, Vite, Vitest, tinyglobby and its fdir/picomatch
paths as not dev-only. `npm explain` establishes why:

- `deepspace@0.44.2 → esbuild@^0.27.0 → 0.27.7`.
- `deepspace@0.44.2 → better-auth@1.7.14 → optional peer vitest
(^2 || ^3 || ^4 || ^5) → 4.1.12 → vite (^6 || ^7 || ^8) → 8.3.8`.
- Vite and Vitest → `tinyglobby@0.2.17 → picomatch@4.0.7`, with
  `fdir@6.5.0 → optional peer picomatch (^3 || ^4)`.
- `typescript-eslint@8.73.0 → @typescript-eslint/typescript-estree@8.73.0
→ tinyglobby@0.2.17`; associated plugin/parser/utils share that chain.
- `@generouted/react-router@1.20.3 → fast-glob@3.3.3
→ micromatch@4.0.8 → picomatch@2.3.2`.

The complete tree records shared/deduplicated and optional edges. An optional
peer's presence in the installation is not evidence of a runtime import by Better
Auth. Deepspace's broad npm package contains both CLI/build and Worker exports;
only the imported exports enter the production bundle.

## Production bundle verification

The unchanged official `npm run build` uses Vite 8.3.8, Cloudflare's plugin and
`deepspaceBuild`, with the real assigned app ID and its guard intact. No custom
replacement Worker build was used to infer production contents. Supplementary
Vite `createBuilder().buildApp()` instrumentation recorded emitted chunk module
IDs/rendered lengths for **both** environments, without changing source/config or
output. The Worker has 172 module entries; six browser JS chunks have
20/7/49/4/18/24 entries respectively in the committed inventory order. The Worker
source map additionally lists 165 original sources. None identify picomatch,
micromatch, fast-glob, tinyglobby, fdir, esbuild, Vite, Vitest, Miniflare or Wrangler.

SDK `dist/worker.js` is itself prebundled. Its original-source map and import
inspection supplement outer module metadata; absence is not concluded from
outer package names alone. SDK CLI/documentation imports are separate entries.
Hono/auth/agent-tool adapters and all exported framework rooms were reviewed;
room wiring does not import the affected tools. Package metadata, actual module
paths and source-map sources agree. Neither package membership nor absence of a
string alone is treated as an exploitability proof.

To reproduce the supplementary graph capture after `npm ci`:

```sh
node --input-type=module <<'JS'
import { createBuilder } from 'vite'
import { writeFileSync } from 'node:fs'
const chunks = []
const builder = await createBuilder({ plugins: [{
  name: 'local-dependency-audit',
  generateBundle(_options, bundle) {
    for (const [file, output] of Object.entries(bundle)) {
      if (output.type === 'chunk') chunks.push({
        environment: this.environment.name, file,
        modules: Object.entries(output.modules).map(([id, m]) => ({
          id: id.replace(process.cwd() + '/', ''),
          renderedLength: m.renderedLength,
        })),
      })
    }
  },
}] })
await builder.buildApp()
writeFileSync('/tmp/miniagentgit-bundle-modules.json', JSON.stringify(chunks, null, 2))
JS
```

This only builds locally. Do not share `dist/`: the official plugin copies local
`.dev.vars` into ignored output. No environment values or generated secrets were
included in audit evidence. Byte/hash inventory covers JS/CSS/HTML only.

| Production output              | Baseline bytes | Final bytes | Change |
| ------------------------------ | -------------: | ----------: | -----: |
| Worker index.js                |      1,001,641 |   1,001,641 |      0 |
| Six client JS chunks, combined |        412,600 |     412,600 |      0 |
| Client CSS                     |         13,080 |      13,080 |      0 |
| Client HTML                    |            397 |         397 |      0 |

Vite reports Worker **1,001.64 kB / 236.51 kB gzip**. Inventory gzip uses Node
zlib defaults (235,343 Worker bytes), so it is a separate compression measurement,
not interchangeable with Vite's settings. Baseline/final output hashes match.
These are local bundle sizes, not runtime memory, CPU, quota or hosted evidence.

## Remediation and compatibility decisions

**Applied: none.** There are no before/after dependency path changes, new
packages or override entries. Both advisories and all sixteen npm findings remain.

**Picomatch deferred (P2):** registry versions end at 4.0.7 and the reviewed
advisory lists no patch. Overriding 2.x to 4.x would still be affected and changes
matcher semantics. Audit suggestions to downgrade Vite to 6.2.7, Vitest to 3.1.4,
plugin-react to 5.2.0 or typescript-eslint to 8.47.0 do not establish a fixed
matcher and would violate the existing integration ranges. No vendor patch,
unpublished fork or framework migration was introduced.

**Esbuild deferred (P3):** first patched release is 0.28.1, registry latest
0.28.2. There is no patched 0.27 release. Updating only the root direct dependency
would leave `deepspace@0.44.2 → esbuild@^0.27.0 → 0.27.7` vulnerable, while an
SDK override would cross a pre-1.0 minor compatibility boundary. Passing build
fixtures would not prove all SDK CLI/documentation functions compatible. No
current affected Windows serving path warrants that forced override. Existing
Cloudflare plugin → Wrangler 4.160.0 → esbuild 0.28.2 and direct Wrangler 4.164.0
→ esbuild 0.28.2 remain unchanged. Wait for an SDK-supported patched resolution
or a separately scoped compatibility qualification.

## Supply-chain verification

`npm ci` installed 462 packages and audited 463; lock metadata counts 602
non-root nodes, including platform-specific optional packages not installed on
Linux. `npm ls --all` reports no invalid/extraneous resolution. Every lockfile
resolved distribution host is `registry.npmjs.org`; resolved URLs and integrity
hashes are unchanged. No Git/tarball source substitution, package addition,
maintainer change introduced by this pass, or engine change exists.

`npm audit signatures` verified **462 registry signatures and 166 attestations**.
This establishes available registry-signature/provenance verification, not code
safety. Registry metadata for current esbuild and candidate 0.28.2 identifies the
same `esbuild` maintainer; candidate engines are Node >=18. Current picomatch
metadata/latest and the two official GitHub advisories were inspected. No
malicious-package or compromised-version notice was identified in those sources;
this is not a comprehensive malware review and vulnerability warnings do not
imply malicious maintainers.

The six existing lockfile install-script nodes are:

- root esbuild 0.27.7 and two nested esbuild 0.28.2 copies: `node install.js`.
- root workerd 1.20261110.1 and Wrangler's workerd 1.20261117.1:
  `node install.js`.
- Darwin-only fsevents 2.3.3: not installed on Linux.

Installed esbuild/workerd scripts provision their platform binaries; no new
script was added. Existing allowScripts entries remain esbuild/workerd only.
There is no claim that allowScripts alone sandboxed every npm lifecycle script.
ESLint's existing unsupported-9.x deprecation warning is a future maintenance
item, not an additional advisory or authorization for an unrelated major upgrade.

## Validation, residual risk and monitoring

See [PASS results](../passes/pass08a1-results.md) for the final gate. Existing
JWT signature/issuer/audience rejection, Alice/Bob/Charlie isolation, owner
checks, immutable commits/atomic HEAD, CI integrity/generation fencing,
agent-tool/MCP auth, bounded inputs and public markup/boundary tests were all
rerun. No application-route vulnerability was found and no behavior changed, so
no synthetic route regression test or exploit tool was added. Render tests do
not establish a new physical-browser or hosted smoke result.

Residual risks: published vulnerable tooling remains installed; malicious source
checkout/configuration and package installation remain build trust boundaries.
No available patch clears picomatch today. A future Windows esbuild server could
expose developer files. This assessment does not qualify hosted OAuth, CLI
credential interoperability, global ingress/CPU/allocation limits or platform
security. The application stays undeployed; existing activation blockers remain.

Re-run full and production-filtered audits after lockfile changes and before any
separately authorized activation. Monitor the two advisory URLs, picomatch
releases and DeepSpace's esbuild range; review compatible patches promptly.
Repeat bundle tracing when SDK entry points, plugins, runtime imports or CI
behavior change. Revalidate provenance, engines and security tests for updates.
Do not execute stored repository configuration as a response to tooling alerts.

Official references: [DeepSpace index](https://docs.deep.space/llms.txt),
[architecture](https://docs.deep.space/concepts/architecture.md),
[agent-tool guide](https://docs.deep.space/guides/local-agent-tools.md),
[esbuild patch release](https://github.com/evanw/esbuild/releases/tag/v0.28.1),
[picomatch npm metadata](https://registry.npmjs.org/picomatch), and
[esbuild npm metadata](https://registry.npmjs.org/esbuild).
Installed SDK exports/types and local CLI help were checked; no SDK API changed.
