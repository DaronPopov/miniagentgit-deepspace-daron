# Repository HTTP API

This is the Pass 04 local vertical slice. The production SDK app-ID build gate
remains intact; no hosted app or production authentication has been validated.
All repository routes require the existing SDK-verified Bearer JWT with trusted
public key, issuer, audience and expiration. The owner verifies the bearer again;
client `x-user-id`, role, ownership and permission claims are never trusted.
No custom OAuth, API token issuance, SQL endpoint, generic record mutation,
branch, merge, diff, restore, Git wire protocol, R2 or binary API is provided.

## Routes

| Method | Path                                     | Input / output                                              |
| ------ | ---------------------------------------- | ----------------------------------------------------------- | ----------------------- |
| POST   | `/api/repositories`                      | JSON `{name,idempotencyKey}` → repository metadata          |
| GET    | `/api/repositories/:id`                  | Repository metadata, owner only                             |
| GET    | `/api/repositories/:id/head`             | `{commitId: string                                          | null, version: number}` |
| POST   | `/api/repositories/:id/commits`          | Commit request below → immutable commit metadata            |
| GET    | `/api/repositories/:id/commits/:commit`  | Basic immutable commit metadata                             |
| GET    | `/api/repositories/:id/tree`             | Query `commit?`, `limit?`, `cursor?` → `{items,nextCursor}` |
| GET    | `/api/repositories/:id/files/:commit`    | Required query `path` → JSON string content                 |
| GET    | `/api/repositories/:id/idempotency/:key` | Previously committed result for the authenticated actor/key |

Every success returns `{ "ok": true, "value": ... }` with HTTP 200. Creation
replay and commit replay return their existing metadata, never a fictional new
resource. Failure returns `{ "ok": false, "error": { "code": ... } }`.
Other repository paths return typed NOT_FOUND. Unsupported methods do not mutate.

Create repository names are 1–64 ASCII letters/digits/spaces/underscore/hyphen,
starting with a letter/digit. Idempotency keys are 16–64 ASCII letters, digits,
underscore or hyphen. The ID is `repo_` plus the first 32 lowercase hex digits of
SHA-256 over UTF-8 JSON `["repository-v1", verifiedSubject, creationKey]`.
This makes creation retries route to the same owner without a mutable global
repository directory. Changing name with the same creation key returns CONFLICT.
The owner checks both canonical namespace identity and persisted repository ID.
Public callers cannot select another creation owner using a PUT endpoint.

## Commit request and snapshot behavior

```json
{
  "expectedHead": null,
  "idempotencyKey": "initial_commit_0001",
  "message": "Initial text snapshot",
  "changes": [
    { "kind": "put", "path": "src/main.ts", "text": "export const value = 1\n" }
  ]
}
```

Use null expectedHead only for an empty repository. Subsequent requests use the
current commit ID. Changes apply to the entire immutable snapshot at that
expected HEAD: put adds/replaces text; delete removes a path. An absent-path
delete is a no-op; an explicitly requested no-op snapshot still creates commit
metadata. Unmentioned files remain present. Empty change arrays and duplicate
paths are rejected. File/directory prefix collisions such as `a` and `a/b` are
rejected. Paths are case-sensitive, printable ASCII, relative, at most 240
characters, with no empty/dot/traversal segments, backslash, colon, percent,
question mark, hash or control characters. No implicit path normalization.

Content is well-formed Unicode text without NUL, encoded as UTF-8 for hashing
and byte limits. No line-ending or Unicode normalization is performed. Path and
metadata fields are bound SQL parameters, never executable SQL. File retrieval
returns JSON text, which never executes a stored HTML/JavaScript source file.

Limits: 256 KiB JSON body, 16 changes, 32 KiB/file, 128 KiB put text/commit,
1 KiB message, 128 files/snapshot, 100 commits/repository, 8 MiB retained logical
accounting. Internal configuration can lower the ceilings. Tree pages default
to 25, maximum 25. Cursor is a validated nonnegative decimal offset bounded by
the file limit, not SQL. Explicit `commit` fixes pagination to that immutable
snapshot; absent `commit` reads current HEAD, which may change between pages.
The owner reads at most the bounded full manifest, then slices a page.
Repository URLs are limited to 2,048 characters. Unknown/duplicate query
parameters are rejected. Other routes accept no query.

## Results and uncertain outcomes

| Code            | HTTP status | Meaning                                                                         |
| --------------- | ----------- | ------------------------------------------------------------------------------- |
| INVALID_INPUT   | 400         | Invalid route, query, shape, path, actor context or snapshot                    |
| UNAUTHENTICATED | 401         | Missing/invalid/expired Bearer identity                                         |
| FORBIDDEN       | 403         | Verified subject is not the persisted owner                                     |
| NOT_FOUND       | 404         | Repository, commit, path or successful replay receipt absent                    |
| CONFLICT        | 409         | Stale HEAD or reused key with different semantic request                        |
| QUOTA_EXCEEDED  | 413         | Input, snapshot, commit-count or retained logical-byte limit                    |
| QUOTA_EXCEEDED  | 429         | Per-owner outstanding commit capacity                                           |
| UNAVAILABLE     | 503         | Verification configuration, owner dispatch, execution or uncertain cancellation |

Commit metadata includes id, parentId, author `{kind:"user",subject}`, message,
and server UTC createdAt. It is read from persisted data on replay. The returned
HEAD version advances once per successful new commit, not per retry.

On a timeout, cancelled request, lost response or 503, retry the **same** semantic
request and key, or look up the key. A matching durable receipt is checked before
stale HEAD rejection; changed semantics with that key conflict. The semantic
digest includes repository, actor, expected HEAD, message and sorted changes;
it excludes the idempotency key and server timestamp. Different change ordering
alone does not change semantics. Only successful commits create replay receipts;
failed validation/quota/conflict keys are not durably reserved. A NOT_FOUND lookup
while execution may still run is not proof of rollback or permission to change
keys. There is no replay by unverified actor or across repository owners.

Browser session-to-Bearer acquisition and the real platform audience remain
unverified. CLI login is not authentication for HTTP users. Local tests generate
short-lived keys and JWTs and exercise the actual SDK verifier in workerd;
those are controlled test identities, not DeepSpace-hosted browser sign-in.
