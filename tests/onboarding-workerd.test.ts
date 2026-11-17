import { expect, it } from 'vitest'
import { identityFixture } from './identity-fixture'
import { workerFixture } from './worker-fixture'
import { httpExamples } from '../src/features/onboarding/examples/requests'
import { objectValue } from '../src/domain/validation'

it('runs every documented HTTP operation and payload through real workerd SQLite with controlled JWT identity', async () => {
  const identity = await identityFixture(),
    worker = await workerFixture(identity.env)
  const token = await identity.token()
  const variables: Record<string, string> = {
    CREATE_KEY: 'docs_create_request_1',
    COMMIT_KEY: 'docs_commit_request_1',
  }
  const expand = (value: string) =>
    value.replace(/\{([A-Z_]+)\}/g, (_match, key: string) => {
      const actual = variables[key]
      if (!actual) throw new Error(`Missing test variable ${key}`)
      return actual
    })
  try {
    for (const example of httpExamples) {
      const path = expand(example.route)
      const headers = {
        ...(example.authenticated ? { authorization: `Bearer ${token}` } : {}),
        'content-type': 'application/json',
      }
      const init = {
        method: example.method,
        headers,
        ...('payload' in example
          ? { body: expand(JSON.stringify(example.payload)) }
          : {}),
      }
      let response = await worker.fetch(path, init)
      if (example.id === 'ci-receipt')
        for (let n = 0; n < 20 && response.status === 409; n++)
          response = await worker.fetch(path, init)
      const json: unknown = await response.json()
      expect(response.status, `${example.id}: ${JSON.stringify(json)}`).toBe(
        example.id === 'ci-request' ? 202 : 200,
      )
      if (example.id === 'health') {
        expect(json).toEqual({ status: 'ok', service: 'miniagentgit' })
        continue
      }
      if (!objectValue(json) || json.ok !== true)
        throw new Error('Missing success envelope')
      if ('capture' in example) {
        if (!objectValue(json.value) || typeof json.value.id !== 'string')
          throw new Error('Missing actual ID')
        variables[example.capture] = json.value.id
      }
      if (example.id === 'file')
        expect(json.value).toBe('export const value = 1\n')
      if (example.id === 'ci-request')
        expect(json.value).toMatchObject({ state: 'queued' })
      if (example.id === 'ci-receipt')
        expect(json.value).toMatchObject({
          state: 'passed',
          commitId: variables.COMMIT_ID,
        })
    }
  } finally {
    await worker.close()
  }
}, 30000)
