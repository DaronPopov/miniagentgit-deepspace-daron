// Own the local static server, disposable browser profile and CDP connection.
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import assert from 'node:assert/strict'

export async function startBrowserSmoke() {
  const root = resolve('dist/client')
  assert(existsSync(join(root, 'index.html')), 'Run npm run build first')
  const directory = mkdtempSync(join(tmpdir(), 'miniagentgit-agent-ui-'))
  const server = createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname
    const file = ['/', '/docs'].includes(pathname)
      ? join(root, 'index.html')
      : resolve(root, '.' + pathname)
    if (!file.startsWith(root + sep) || !existsSync(file)) {
      res.writeHead(404)
      res.end()
      return
    }
    res.setHeader(
      'Content-Type',
      file.endsWith('.js')
        ? 'text/javascript'
        : file.endsWith('.css')
          ? 'text/css'
          : file.endsWith('.svg')
            ? 'image/svg+xml'
            : 'text/html',
    )
    res.end(readFileSync(file))
  })
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  const origin = `http://127.0.0.1:${server.address().port}`
  const chrome = spawn(
    process.env.CHROME_BINARY ?? '/usr/bin/google-chrome',
    [
      '--headless',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-background-networking',
      '--no-first-run',
      '--remote-debugging-port=0',
      `--user-data-dir=${directory}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  )
  let ws
  try {
    for (
      let n = 0;
      !existsSync(join(directory, 'DevToolsActivePort')) && n < 100;
      n++
    )
      await new Promise((r) => setTimeout(r, 50))
    const port = readFileSync(
      join(directory, 'DevToolsActivePort'),
      'utf8',
    ).split('\n')[0]
    const pages = await (
      await fetch(`http://127.0.0.1:${port}/json/list`)
    ).json()
    ws = new WebSocket(
      pages.find((p) => p.type === 'page').webSocketDebuggerUrl,
    )
    await new Promise((done) =>
      ws.addEventListener('open', done, { once: true }),
    )
    let next = 0
    const pending = new Map(),
      errors = [],
      requests = [],
      failures = []
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.id) {
        const item = pending.get(message.id)
        pending.delete(message.id)
        if (message.error) item.reject(message.error)
        else item.resolve(message.result)
      } else if (message.method === 'Runtime.exceptionThrown')
        errors.push(message.params.exceptionDetails.text)
      else if (message.method === 'Network.requestWillBeSent')
        requests.push(message.params.request.url)
      else if (
        message.method === 'Network.responseReceived' &&
        message.params.response.status >= 400
      )
        failures.push(message.params.response.url)
    })
    const call = (method, params = {}) =>
      new Promise((done, reject) => {
        const id = ++next
        pending.set(id, { resolve: done, reject })
        ws.send(JSON.stringify({ id, method, params }))
      })
    const evaluate = async (expression) => {
      const result = await call('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
      })
      assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails))
      return result.result.value
    }
    const settled = () =>
      evaluate(
        'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))',
      )
    const key = async (value, code, number) => {
      await call('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: value,
        code,
        windowsVirtualKeyCode: number,
      })
      await call('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: value,
        code,
        windowsVirtualKeyCode: number,
      })
      await settled()
    }
    await call('Page.bringToFront')
    await call('Emulation.setFocusEmulationEnabled', { enabled: true })
    await call('Page.enable')
    await call('Runtime.enable')
    await call('Network.enable')
    await call('Browser.grantPermissions', {
      origin,
      permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
    })
    return {
      origin,
      call,
      evaluate,
      settled,
      key,
      errors,
      requests,
      failures,
      close: async () => {
        ws.close()
        chrome.kill('SIGTERM')
        if (chrome.exitCode === null)
          await new Promise((done) => chrome.once('exit', done))
        await new Promise((done) => server.close(done))
        rmSync(directory, { recursive: true, force: true })
      },
    }
  } catch (error) {
    ws?.close()
    chrome.kill('SIGTERM')
    if (chrome.exitCode === null)
      await new Promise((done) => chrome.once('exit', done))
    await new Promise((done) => server.close(done))
    rmSync(directory, { recursive: true, force: true })
    throw error
  }
}
