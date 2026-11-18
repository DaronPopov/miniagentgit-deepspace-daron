import { agentTokenIssuer } from 'deepspace/worker'
import { tenantFixture } from './tenant-fixture'
import { REPOSITORY_HEAD_TOOL } from '../src/features/agent-tools/contracts'

/** CLI-shaped JWTs signed only by ephemeral local test keys; no token exchange. */
export async function agentCredentialFixture(jobs = false) {
  const f = await tenantFixture(jobs)
  const token = (
    subject = 'Alice',
    overrides: Readonly<Record<string, unknown>> = {},
  ) =>
    f.identity.token(subject, {
      iss: agentTokenIssuer(String(f.identity.env.AUTH_JWT_ISSUER)),
      aud: 'http://localhost',
      scope: 'agent',
      ...overrides,
    })
  const send = (
    credential: string,
    path: string,
    body?: unknown,
    method?: string,
  ) =>
    f.fetch(path, {
      method: method ?? (body === undefined ? 'GET' : 'POST'),
      headers: {
        authorization: `Bearer ${credential}`,
        'content-type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  const head = (credential: string, id: string) =>
    send(credential, `/_deepspace/agent/tools/${REPOSITORY_HEAD_TOOL}`, {
      input: { repositoryId: id },
    })
  return { ...f, token, send, head }
}
