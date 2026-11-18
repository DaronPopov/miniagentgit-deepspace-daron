"""Run the checked-in browser scenarios through pinned Microsoft Playwright MCP."""
import argparse
import json
import os
import pathlib
import shutil
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('output', type=pathlib.Path)
output = parser.parse_args().output.resolve()
output.mkdir(parents=True, exist_ok=True)

PROBE = r"""
async (mcpPage) => {
  const settings = SETTINGS
  const page = await mcpPage.context().newPage()
  const assert = (condition, detail) => { if (!condition) throw new Error(detail) }
  page.setDefaultTimeout(6000)
  const errors = [], consoleHttp = [], warnings = [], network = [], failed = [], screenshots = []
  page.on('pageerror', error => errors.push(error.name))
  page.on('console', message => {
    if (message.type() === 'warning') warnings.push(message.text())
    if (message.type() === 'error') {
      const match = /Failed to load resource: the server responded with a status of (\d+)/.exec(message.text())
      if (match) consoleHttp.push(Number(match[1]))
      else errors.push(message.text())
    }
  })
  page.on('response', response => {
    if (response.status() >= 400)
      network.push([new URL(response.url()).pathname, response.status()])
  })
  page.on('requestfailed', request => {
    failed.push(request.failure()?.errorText)
  })
  await page.context().clearCookies()
  await page.clock.install()
  await page.setViewportSize({ width: settings.width, height: settings.height })
  await page.emulateMedia({ colorScheme: settings.theme })
  assert(await page.evaluate(theme => matchMedia('(prefers-color-scheme: ' + theme + ')').matches,
    settings.theme), 'Requested theme is active')
  const capture = async name => {
    const layout = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
      mains: document.querySelectorAll('main').length,
      h1: document.querySelectorAll('h1').length,
    }))
    assert(layout.mains === 1 && layout.h1 === 1 && layout.content <= layout.width, 'Layout ' + name + ': ' + JSON.stringify(layout))
    const filename = settings.width + '-' + settings.theme + '-' + name + '.png'
    await page.screenshot({ path: settings.scratch + '/' + filename })
    screenshots.push({ filename, layout })
  }
  try {
    PUBLIC_FLOW
    DASHBOARD_FLOW
    await publicChecks(page, settings.origin, capture, assert)
    await dashboardChecks(page, settings.origin, settings.fixture, capture, assert)
    assert(!errors.length, JSON.stringify(errors))
    assert(warnings.every(message => message === "Error with Permissions-Policy header: Unrecognized feature: 'document-domain'."), 'Unexpected warning ' + JSON.stringify(warnings))
    assert(consoleHttp.every(status => [401, 403, 404, 409].includes(status)), 'Unexpected console HTTP error')
    const { foreign, populated, failed: job } = settings.fixture
    const expected = new Map([
      ['/pass11b-missing', 404], ['/api/me', 401],
      ['/api/repositories/' + foreign, 403],
      ['/api/repositories/repo_' + '0'.repeat(32), 404],
      ['/api/repositories/' + populated + '/ci/jobs/' + job + '/receipt', 409],
    ])
    assert(network.every(([path, status]) => expected.get(path) === status), 'Unexpected HTTP failures ' + JSON.stringify(network))
    assert(network.length === expected.size, 'Expected failure count')
    assert(failed.every(error => error === 'net::ERR_ABORTED'), 'Unexpected network failure ' + JSON.stringify(failed))
    return { screenshots, network, errors, warnings, consoleHttp, aborted: failed.length, theme: settings.theme, viewport: [settings.width, settings.height] }
  } catch (error) {
    const details = await page.locator('main').innerText().catch(() => '')
    throw new Error(String(error) + '\n' + JSON.stringify(network) + '\n' + details.slice(-6500))
  } finally {
    await page.close()
  }
}
"""


def run_mcp(scratch, origin, fixture, width, height, theme):
    command = [
        'npx.cmd' if os.name == 'nt' else 'npx',
        '--yes', '@playwright/mcp@0.0.85', '--browser', 'chrome', '--headless',
        '--isolated', '--allowed-origins', origin, '--output-dir', str(scratch),
    ]
    with subprocess.Popen(command, cwd=scratch, stdin=subprocess.PIPE,
                          stdout=subprocess.PIPE, text=True, encoding='utf-8') as process:
        def call(method, params, notification=False):
            message = dict(jsonrpc='2.0', method=method, params=params)
            if not notification:
                message['id'] = 1
            process.stdin.write(json.dumps(message) + '\n')
            process.stdin.flush()
            if notification:
                return None
            for line in process.stdout:
                reply = json.loads(line)
                if reply.get('id') == 1:
                    if 'error' in reply:
                        raise RuntimeError(reply['error'])
                    return reply['result']
            raise RuntimeError('Playwright MCP exited')

        try:
            server = call('initialize', dict(protocolVersion='2025-03-26', capabilities={},
                                            clientInfo=dict(name='pass11b-browser', version='1')))
            call('notifications/initialized', {}, notification=True)
            settings = dict(origin=origin, fixture=fixture, width=width, height=height,
                            theme=theme, scratch=scratch.as_posix())
            code = PROBE.replace('SETTINGS', json.dumps(settings)).replace(
                'PUBLIC_FLOW', (ROOT / 'dashboard-browser-public.mjs').read_text(encoding='utf-8').removeprefix('export ')).replace(
                'DASHBOARD_FLOW', (ROOT / 'dashboard-browser-scenarios.mjs').read_text(encoding='utf-8').removeprefix('export '))
            result = call('tools/call', dict(name='browser_run_code_unsafe', arguments=dict(code=code)))
            detail = result['content'][0]['text']
            if result.get('isError'):
                raise RuntimeError(detail.split('### Ran Playwright code')[0])
            row = json.loads(detail.split('### Result\n', 1)[1].split('\n###', 1)[0])
            for screenshot in row['screenshots']:
                filename = screenshot['filename']
                shutil.copyfile(scratch / filename, output / filename)
            print(f'{width} × {height} {theme}: PASS', flush=True)
            return server['serverInfo'], row
        finally:
            process.stdin.close()


def run_viewport(width, height, theme):
    # A viewport is one bounded operator workflow, with its own app budget.
    with tempfile.TemporaryDirectory(prefix='miniagentgit-dashboard-') as directory:
        with subprocess.Popen(['node', 'scripts/preview-frontend.mjs', '--repository-fixture'],
                              stdout=subprocess.PIPE, text=True, encoding='utf-8') as preview:
            try:
                fixture = json.loads(preview.stdout.readline())
                origin = preview.stdout.readline().strip().rstrip('/')
                if not origin.startswith('http://127.0.0.1:'):
                    raise RuntimeError('Expected isolated loopback preview')
                return run_mcp(pathlib.Path(directory), origin, fixture, width, height, theme)
            finally:
                preview.terminate()


results = []
for width, height in [(1440, 1000), (390, 844)]:
    for theme in ['light', 'dark']:
        server, row = run_viewport(width, height, theme)
        results.append(row)
(output / 'inspection.json').write_text(
    json.dumps(dict(server=server, scenarios=results), indent=2) + '\n',
    encoding='utf-8')
