import type { DocumentationSection } from '../contracts/documentation'
import type { NavigationLink } from '../../product-site/contracts/presentation'

export const docsNavigation = [
  { label: 'Home', href: '/' },
  { label: 'Connect your agent', href: '#quick-start' },
  { label: 'API guide', href: '#api-guide' },
] as const satisfies readonly NavigationLink[]
export const guideSections = [
  {
    id: 'overview',
    title: 'A small API for agent-owned changes',
    paragraphs: [
      'MiniAgentGit stores immutable text snapshots behind a headless HTTP API. Create a repository, submit a commit, read files and request fixed CI validation for that exact commit. No CLI package or installer is required for these HTTP examples.',
      'Every private repository has one persistence owner. Its verified owner can access it; knowing the repository ID does not grant permission. One account can own multiple repositories.',
    ],
  },
  {
    id: 'commits',
    title: 'Immutable snapshots and safe concurrency',
    paragraphs: [
      'Put changes add or replace text; delete changes remove paths; unmentioned files remain. A commit stores a full immutable manifest. Earlier files and commits do not change when you submit a correction.',
      'Send expectedHead with every commit: null for an empty repository, otherwise the current commit ID. The transaction checks it and advances HEAD atomically with commit data. HTTP 409 CONFLICT means the state is stale or a key was reused for different intent. Read current state before preparing a new request.',
    ],
  },
  {
    id: 'retries',
    title: 'Retry the same intent',
    paragraphs: [
      'Keep the idempotency key and semantic body unchanged after a timeout, lost response or HTTP 503. Successful outcomes are durably replayed before the stale-HEAD check. Changing a key or body can create another intent. An uncertain response is not proof of rollback.',
      'Creation keys and commit keys are distinct. Run setup once for a fresh workflow, not again for a retry. Retain the generated keys until the outcome is known. Idempotency keys must be 16–64 ASCII letters, digits, underscores or hyphens.',
    ],
  },
  {
    id: 'retrieval',
    title: 'Read files from a specific commit',
    paragraphs: [
      'Commit metadata includes its parent, author and creation time. Tree results are paginated; select a commit explicitly so pages refer to the same immutable snapshot. File retrieval returns JSON text, never a hosted executable source file.',
      'Paths are relative printable ASCII, at most 240 characters, with no traversal, backslashes or reserved separators. URL-encode a file path in the path query; URL encoding is not part of the stored path.',
    ],
  },
  {
    id: 'ci-guide',
    title: 'CI checks a commit, not moving HEAD',
    paragraphs: [
      'A CI request persists a job before HTTP 202 returns its ID. Read its status, then retrieve the completed receipt. A 202 response means accepted, not passed. Repeated requests for the same immutable commit and check definition reuse the job or receipt.',
      'Checks verify content and manifest integrity, supported text paths, byte and line limits, malformed text, whitespace and final newlines. They never execute submitted code. A failing result does not change HEAD or history; submit a corrected commit and validate it separately.',
      'States are queued, running, passed, failed, cancelled, expired or interrupted. A receipt can describe a policy failure or a runtime failure. Generation fencing prevents stale runners from replacing newer outcomes. Recovery after owner recreation is driven by the next authorized CI request, not guaranteed unattended execution.',
    ],
  },
  {
    id: 'authentication',
    title: 'Bring a verified API credential',
    paragraphs: [
      'All examples except health require a Bearer JWT accepted by the configured SDK verifier, including signature, issuer, audience and expiration. The repository authority separately checks persisted ownership. Missing trusted configuration fails closed.',
      'DeepSpace CLI developer login is not automatically a user API credential. This guide does not provide a token issuer, browser exchange or login flow. Obtain a compatible credential only through the application’s supported authentication integration once available. Never place a real token in source control, URLs or screenshots.',
    ],
  },
  {
    id: 'availability',
    title: 'Availability and boundaries',
    paragraphs: [
      'The HTTP repository and CI workflow was previously tested on a hosted application, which is now undeployed. Deploy or select a running application before using these examples. Hosted user authentication through a fresh browser sign-in and provider runtime quotas still require qualification.',
      'Use a service origin supplied by the operator for BASE_URL, without a trailing slash. Replace BEARER_JWT in your terminal with a compatible credential. Repository, commit and job IDs come from actual responses; no public test credentials are supplied here.',
      'This API does not implement Git wire compatibility, branches, merges, arbitrary binaries or MCP. CI does not run package installation, scripts, ESLint, tests or TypeScript type checking; syntax parsing is not provided.',
    ],
  },
  {
    id: 'errors',
    title: 'Read outcomes before retrying',
    paragraphs: [
      'Success responses use {ok:true,value:…}; health alone returns {status:"ok",service:"miniagentgit"}. Errors use {ok:false,error:{code:…}}. API identity is value.subject; repository, commit and job identifiers are value.id.',
      'HTTP 400 means invalid input; 401 invalid identity; 403 wrong owner; 404 missing data; 409 conflict or pending receipt; 413 input or retained-storage quota; 429 outstanding capacity; 503 unavailable or uncertain operation. Do not blindly repeat mutations with new keys.',
    ],
  },
] as const satisfies readonly DocumentationSection[]
export const quickStart = {
  title: 'Connect your agent',
  introduction:
    'Choose one command mode and run its setup once. Copying never runs a command, substitutes credentials, or calls the API. Replace the two angle-bracket placeholders in your terminal before making requests.',
  powershell: 'Windows PowerShell 5.1+ · Invoke-RestMethod',
  curl: 'PowerShell 7.3+ on Windows · curl.exe 7.76+ · Standard native argument passing',
  curlNote:
    'These curl.exe commands use PowerShell syntax, not Bash or cmd.exe. The setup explicitly preserves JSON quotes for native arguments. Use the native curl.exe binary, not the Windows PowerShell curl alias.',
  placeholders:
    'BASE_URL is the trusted HTTP service origin; TOKEN is a compatible Bearer JWT. CREATE_KEY and COMMIT_KEY are generated once in setup. REPOSITORY_ID, COMMIT_ID and JOB_ID are captured from successful prior responses. Environment variables live in this terminal process; the page never reads or fills them.',
} as const
