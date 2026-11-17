# MiniAgentGit

Read [engineering standards](docs/engineering-standards.md) before editing.
This is one npm/TypeScript DeepSpace project. GitHub repository
`DaronPopov/miniagentgit-deepspace-daron` is its source authority; target `main`.
Preserve unrelated changes. Do not run `deepspace push` or introduce another
source authority. Do not register or deploy the app without an explicit request.

## Required workflow

- Inspect Git status, callers, and current code before editing.
- Read https://docs.deep.space/llms.txt and relevant official Markdown pages
  before SDK work. Verify signatures in installed package types and CLI help.
- Use supported Node and npm versions from package.json. Install with `npm ci`.
- Stage new source before `npm run check:size`: it scans Git-tracked files,
  including the index. CI checks the committed tree.
- Run `npm run validate` before committing. It checks types, lint, formatting,
  source size, tests, and production build. Report exactly what was validated.
- Never commit credentials, local runtime state, or generated route files.

## Non-negotiable standards

- Handwritten source and tests: at most 185 physical lines, including comments
  and blanks. HTTP/API adapters and framework integration files: at most 300.
  Tests always retain the 185 limit. Generated, third-party, and lockfiles are
  excluded. Document and justify every exception in engineering standards.
- Split by cohesive responsibility, never merely to satisfy line counts.
- Prefer types, interfaces, readonly data, functions, and pure domain logic.
  Represent expected outcomes with discriminated unions.
- Avoid abstract classes, inheritance hierarchies, service locators, speculative
  factories, broad `any`, unexplained assertions, and hidden mutable globals.
  Classes require a framework requirement or demonstrated lifecycle need.
- Keep dependencies explicit and modules responsible for one cohesive concern.
- Only the repository persistence authority may advance HEAD. Transport must
  never mutate repository state directly. Domain code must not import React,
  HTTP, or Cloudflare SDKs. HTTP and future MCP adapters share application use
  cases. No circular dependencies or cross-layer shortcuts.
- Pass 01 does not implement repository commits, history, auth flows, or MCP.
