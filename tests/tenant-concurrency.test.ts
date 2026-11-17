import { expect, it } from 'vitest'
import { nodeDatabase, request, unwrap } from './sqlite-fixture'
import { repositoryIdentity } from '../src/domain/commit-hashing'
import { createRepositoryAuthority } from '../src/server/storage/repository-authority'
import { createRepositoryRuntime } from '../src/application/repository-runtime'
import { deferred } from './scheduler-fixture'

it('keeps Bob progressing while Alice owns an asynchronous execution claim, with separate actual SQLite authorities', async () => {
  async function owner(subject: string) {
    const database = nodeDatabase(),
      actor = { kind: 'user' as const, subject }
    const creation = { name: 'Private', idempotencyKey: 'same_creation_key_1' }
    const id = await repositoryIdentity(actor, creation.idempotencyKey)
    const authority = createRepositoryAuthority({ id, db: database.db })
    unwrap(await authority.initialize(actor, creation))
    return { ...database, id, authority, context: { repositoryId: id, actor } }
  }
  const alice = await owner('Alice'),
    bob = await owner('Bob'),
    gate = deferred<void>(),
    entered = deferred<void>()
  const ar = createRepositoryRuntime({
    id: alice.id,
    authority: {
      ...alice.authority,
      executeCommit: async (...args) => {
        entered.resolve()
        await gate.promise
        return alice.authority.executeCommit(...args)
      },
    },
  })
  const br = createRepositoryRuntime({ id: bob.id, authority: bob.authority })
  const first = ar.service.createCommit(alice.context, request())
  try {
    await entered.promise
    const commit = unwrap(await br.service.createCommit(bob.context, request()))
    expect(unwrap(await bob.authority.readHead(bob.context)).commitId).toBe(
      commit.id,
    )
    expect(
      unwrap(await alice.authority.readHead(alice.context)).commitId,
    ).toBeNull()
    gate.resolve()
    unwrap(await first)
  } finally {
    gate.resolve()
    await first
    alice.close()
    bob.close()
  }
})
