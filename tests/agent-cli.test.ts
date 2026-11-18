import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { SESSION_COOKIE } from 'deepspace/worker'
import { expect, it } from 'vitest'
import { agentCredentialFixture } from './agent-credential-fixture'
import { REPOSITORY_HEAD_TOOL } from '../src/features/agent-tools/contracts'

it('runs the installed DeepSpace CLI against simulated local token issuance and actual workerd ownership, including 401 refresh', async () => {
  const credential = `local-fixture-${randomUUID()}`
  let sessionFile: string | undefined
  const f = await agentCredentialFixture()
  const directory = join(homedir(), '.deepspace')
  let origin = '',
    exchanges = 0,
    firstDiscovery = true
  const server = createServer(async (request, response) => {
    try {
      const chunks: Buffer[] = []
      for await (const chunk of request) chunks.push(Buffer.from(chunk))
      const body = Buffer.concat(chunks).toString()
      if (request.url === '/api/auth/agent-token') {
        expect(request.headers.cookie).toBe(`${SESSION_COOKIE}=${credential}`)
        expect(JSON.parse(body)).toEqual({ target: origin })
        exchanges++
        response.setHeader('Content-Type', 'application/json')
        response.end(
          JSON.stringify({ token: await f.token('Alice', { aud: origin }) }),
        )
        return
      }
      if (request.url === '/_deepspace/agent/tools' && firstDiscovery) {
        firstDiscovery = false
        response.writeHead(401)
        response.end('{}')
        return
      }
      const reply = await f.fetchUrl(origin + request.url, {
        method: request.method,
        headers: {
          authorization: request.headers.authorization ?? '',
          'content-type': 'application/json',
        },
        ...(['GET', 'HEAD'].includes(request.method ?? '') ? {} : { body }),
      })
      response.writeHead(reply.status, { 'Content-Type': 'application/json' })
      response.end(Buffer.from(await reply.arrayBuffer()))
    } catch {
      response.writeHead(500)
      response.end('{}')
    }
  })
  try {
    const a = await f.create('Alice')
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
    const address = server.address()
    if (!address || typeof address === 'string')
      throw new Error('Missing fixture port')
    origin = `http://127.0.0.1:${address.port}`
    mkdirSync(directory, { recursive: true, mode: 0o700 })
    const file = join(
      directory,
      `session.${new URL(origin).host.replace(/[^a-zA-Z0-9]+/g, '-')}`,
    )
    // Exclusive creation and exact-path cleanup preserve existing CLI sessions.
    writeFileSync(file, credential, { mode: 0o600, flag: 'wx' })
    sessionFile = file
    const run = async (args: readonly string[]) => {
      const { stdout, stderr } = await promisify(execFile)(
        process.execPath,
        [
          resolve('node_modules/deepspace/dist/cli.js'),
          'agent',
          ...args,
          '--json',
        ],
        {
          cwd: process.cwd(),
          timeout: 15000,
          maxBuffer: 65536,
          env: {
            PATH: process.env.PATH,
            DEEPSPACE_AUTH_URL: origin,
            DEEPSPACE_API_URL: origin,
            DEEPSPACE_PLATFORM_URL: origin,
            DEEPSPACE_DEPLOY_URL: origin,
          },
        },
      )
      expect(stdout + stderr).not.toContain(credential)
      expect(stdout + stderr).not.toMatch(/eyJ[A-Za-z0-9_-]+\./)
      return JSON.parse(stdout)
    }
    const discovered = await run(['tools', origin])
    expect(discovered).toMatchObject({
      ok: true,
      tools: expect.arrayContaining([
        expect.objectContaining({ name: REPOSITORY_HEAD_TOOL }),
      ]),
    })
    const result = await run([
      'invoke',
      origin,
      REPOSITORY_HEAD_TOOL,
      '--input',
      JSON.stringify({ repositoryId: a.id }),
    ])
    expect(result).toMatchObject({
      ok: true,
      result: { repositoryId: a.id, commitId: null, version: 0 },
    })
    expect(exchanges).toBe(3)
  } finally {
    if (server.listening)
      await new Promise<void>((done, reject) =>
        server.close((error) => (error ? reject(error) : done())),
      )
    await f.close()
    if (sessionFile) rmSync(sessionFile)
  }
}, 30000)
