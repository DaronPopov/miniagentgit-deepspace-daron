import argparse
import json
import os
import pathlib
import re
import subprocess
import tempfile
from urllib.parse import urlsplit

parser = argparse.ArgumentParser()
parser.add_argument('origin')
parser.add_argument('output', type=pathlib.Path)
parser.add_argument('--local-identity', action='store_true')
args = parser.parse_args()
origin = args.origin.rstrip('/')
target = urlsplit(origin)
if (target.scheme, target.hostname, target.path, target.query, target.fragment) != ('http', '127.0.0.1', '', '', '') or not target.port or target.username:
    parser.error('Use the loopback preview origin printed by the preview script.')
output = args.output.resolve()
output.mkdir(parents=True, exist_ok=True)

INSPECT = """() => ({
  title: document.title,
  headings: [...document.querySelectorAll('h1')].map(e => e.innerText),
  main: document.querySelectorAll('main').length,
  navigation: document.querySelectorAll('nav').length,
  width: innerWidth,
  overflow: document.documentElement.scrollWidth > innerWidth,
  missingLabels: [...document.querySelectorAll('input')].filter(e => !e.labels?.length && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby')).length,
  brokenAnchors: [...new Set([...document.querySelectorAll('a[href^="#"]')].map(a => a.hash).filter(hash => !document.getElementById(hash.slice(1))))],
  status: document.querySelector('[role=status]')?.innerText ?? null,
  controls: [...document.querySelectorAll('button')].slice(0, 2).map(e => e.innerText)
})"""

def json_result(response):
    return json.loads(response.split('### Result\n', 1)[1].split('\n###', 1)[0])

def capture(tool, scratch):
    evidence = []
    for width, height in [(1440, 1000), (390, 844)]:
        tool('resize', width=width, height=height)
        pages = [
            ('landing', '/', 'Version control built for coding agents.'),
            ('docs', '/docs', 'Connect your agent over HTTP.'),
            ('missing', '/pass11a-missing', None),
            ('unauthorized', '/api/me', None),
        ]
        if args.local_identity:
            pages += [
                ('sign-in', '/dashboard', 'Sign in to continue.'),
                ('dashboard', '/api/auth/oauth-complete?code=pass11a-local-browser', 'Signed in as'),
            ]
        else:
            pages.append(('auth-failure', '/dashboard', 'Authentication failed'))
        for name, path, heading in pages:
            tool('navigate', url=origin + path)
            if heading:
                tool('wait_for', text=heading)
            state = json_result(tool('evaluate', function=INSPECT))
            details = {'surface':name, 'viewport':[width,height], **state}
            expected = {
                'missing': [('GET', '/pass11a-missing', '404')],
                'unauthorized': [('GET', '/api/me', '401')],
                'auth-failure': [('GET', '/api/auth/get-session', '503')],
            }.get(name, [])
            filename = f'{name}-{width}.png'
            tool('take_screenshot', type='png', filename=filename)
            (output / filename).write_bytes((scratch / filename).read_bytes())
            if heading:
                assert state['main'] == 1 and len(state['headings']) == 1, details
                assert not (state['overflow'] or state['missingLabels'] or state['brokenAnchors']), details
                tool('snapshot', depth=3)
                tool('press_key', key='Tab')
                details['focus'] = json_result(tool('evaluate', function="""() => ({
                  label: document.activeElement.textContent.trim(),
                  outline: getComputedStyle(document.activeElement).outlineStyle,
                  width: getComputedStyle(document.activeElement).outlineWidth
                })"""))
                tool('press_key', key='Enter')
                details['skipTarget'] = json_result(tool('evaluate', function='() => document.activeElement.id'))
                assert details['focus'] == {'label': 'Skip to content', 'outline': 'solid', 'width': '3px'}, details
                assert details['skipTarget'] == 'main-content', details
            network = tool('network_requests', static=True)
            responses = re.findall(
                r'\[(GET|POST)\] ' + re.escape(origin) + r'(.*?) => \[(\d{3})\]',
                network,
            )
            details['httpErrors'] = sorted(set(row for row in responses if int(row[2]) >= 400))
            assert details['httpErrors'] == expected, details
            if name in {'landing', 'docs'}:
                assert not any('/api/' in row[1] for row in responses), details
            console = tool('console_messages', level='warning')
            counts = re.search(r'Errors: (\d+), Warnings: (\d+)', console)
            details['consoleErrors'], details['consoleWarnings'] = map(int, counts.groups())
            details['consoleWarningsText'] = [
                line.replace(origin, '<loopback>')
                for line in console.splitlines() if line.startswith('[WARNING]')
            ]
            assert details['consoleErrors'] == len(expected), details
            if name == 'dashboard':
                assert ('GET', '/api/me', '200') in responses, details
                details['verifiedIdentity'] = True
                tool('click', target='button:has-text("Sign out")')
                tool('wait_for', text='Version control built for coding agents.')
                tool('navigate', url=origin + '/dashboard')
                tool('wait_for', text='Sign in to continue.')
                details['signOut'] = True
            evidence.append(details)
        tool('navigate', url=origin + '/')
        tool('click', target='nav a[href="/docs"]')
        tool('wait_for', text='Connect your agent over HTTP.')
    return evidence

def run(scratch):
    command = ['npx.cmd' if os.name == 'nt' else 'npx','--yes','@playwright/mcp@0.0.85','--browser','chrome','--headless','--isolated','--allowed-origins',origin,'--output-dir',str(scratch),'--console-level','error']
    with subprocess.Popen(command, stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,encoding='utf-8',cwd=scratch) as process:
        def rpc(method, params=None, notification=False):
            message = dict(jsonrpc='2.0',method=method)
            if not notification:
                message['id'] = 1
            if params is not None:
                message['params'] = params
            process.stdin.write(json.dumps(message)+'\n')
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
        def tool(name, **arguments):
            response = rpc('tools/call', dict(name='browser_'+name,arguments=arguments))
            if response.get('isError'):
                raise RuntimeError('Playwright tool failed: ' + name)
            return '\n'.join(c['text'] for c in response['content'] if c['type']=='text')
        try:
            server = rpc('initialize',dict(protocolVersion='2025-03-26', capabilities={}, clientInfo=dict(name='pass11a-browser', version='1')))
            rpc('notifications/initialized',notification=True)
            tools = sorted(t['name'] for t in rpc('tools/list')['tools'])
            tool('emulate_media', colorScheme='light')
            evidence = capture(tool, scratch)
            (output/'inspection.json').write_text(json.dumps({'server':server['serverInfo'],'tools':tools,'homeToDocs':[1440,390],'surfaces':evidence},indent=2)+'\n',encoding='utf-8')
        finally:
            try:
                tool('close')
            finally:
                process.stdin.close()

with tempfile.TemporaryDirectory(prefix='miniagentgit-browser-') as directory:
    run(pathlib.Path(directory))
