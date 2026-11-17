// Local production-client smoke only. Requires npm run build and installed Chrome.
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startBrowserSmoke } from './browser-smoke-runtime.mjs'

const browser = await startBrowserSmoke()
const { origin, call, evaluate, settled, key, errors, requests, failures } =
  browser
try {
  const results = []
  for (const width of [320, 390, 768, 1440])
    for (const theme of ['light', 'dark']) {
      await call('Emulation.setDeviceMetricsOverride', {
        width,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: width < 640,
      })
      await call('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-color-scheme', value: theme }],
      })
      await call('Page.navigate', { url: origin })
      await evaluate(
        `new Promise((r, reject) => { let n = 0; function poll() { if (document.querySelector('#connect input')) r(); else if (n++ < 100) setTimeout(poll, 20); else reject('render timeout') } poll() })`,
      )
      await settled()
      await key('Tab', 'Tab', 9)
      assert.equal(
        await evaluate('document.activeElement.textContent'),
        'Skip to content',
      )
      await key('Enter', 'Enter', 13)
      assert.equal(await evaluate('document.activeElement.id'), 'main-content')
      const before = requests.length
      const modes = []
      for (const mode of ['codex', 'claude', 'http']) {
        await evaluate(
          `document.querySelector('input[value="${mode}"]').click()`,
        )
        await settled()
        const state = await evaluate(
          `({ mode: document.querySelector('input[name="agent-integration"]:checked').value, text: document.querySelector('#agent-setup').innerText, codes: document.querySelectorAll('#agent-setup pre').length, overflow: document.documentElement.scrollWidth > innerWidth })`,
        )
        assert.equal(state.mode, mode)
        assert.equal(state.overflow, false)
        assert.equal(state.codes, mode === 'http' ? 1 : 0)
        assert(
          state.text.includes(
            mode === 'http' ? 'currently undeployed' : 'planned',
          ),
        )
        modes.push({ mode, codes: state.codes, overflow: state.overflow })
      }
      for (const shell of ['powershell', 'curl']) {
        await evaluate(
          `document.querySelectorAll('input[name="agent-shell"]')[${shell === 'powershell' ? 0 : 1}].click()`,
        )
        await settled()
        const copied = await evaluate(
          `(async () => { const code = document.querySelector('#agent-setup code').textContent; document.querySelector('#agent-setup button').click(); for (let n = 0; n < 50 && !document.querySelector('.docs-copy-status').textContent.includes('copied'); n++) await new Promise(r => setTimeout(r, 10)); return { exact: await navigator.clipboard.readText() === code, code } })()`,
        )
        assert(copied.exact)
        assert(copied.code.includes('<BASE_URL>'))
        assert(copied.code.includes('/api/me'))
        assert(
          copied.code.includes(
            shell === 'curl' ? 'curl.exe' : 'Invoke-RestMethod',
          ),
        )
      }
      assert.equal(
        requests.length,
        before,
        'Switching or copying must not request data',
      )
      await evaluate(`document.querySelector('input[value="http"]').focus()`)
      await key('ArrowRight', 'ArrowRight', 39)
      assert.equal(
        await evaluate(
          `document.querySelector('input[name="agent-integration"]:checked').value`,
        ),
        'codex',
      )
      assert.equal(await evaluate(`document.activeElement.value`), 'codex')
      await key('ArrowLeft', 'ArrowLeft', 37)
      assert.equal(
        await evaluate(
          `document.querySelector('input[name="agent-integration"]:checked').value`,
        ),
        'http',
      )
      const focus = await evaluate(
        `getComputedStyle(document.activeElement.closest('label')).outlineWidth`,
      )
      assert.equal(focus, '3px')
      await evaluate(`document.querySelector('#connect').scrollIntoView()`)
      await settled()
      const geometry = await evaluate(
        `({width:innerWidth,scroll:document.documentElement.scrollWidth,diagrams:document.querySelectorAll('svg[role="img"]').length,panels:document.querySelectorAll('#connect pre').length,clipped:[...document.querySelectorAll('#connect button, #connect input')].some(e=>{const r=e.getBoundingClientRect();return r.left<0||r.right>innerWidth})})`,
      )
      assert.equal(geometry.diagrams, 2)
      assert.equal(geometry.clipped, false)
      const screenshot = join(
        tmpdir(),
        `miniagentgit-agent-${width}-${theme}.png`,
      )
      const picture = await call('Page.captureScreenshot', { format: 'png' })
      writeFileSync(screenshot, Buffer.from(picture.data, 'base64'))
      results.push({
        width,
        theme,
        modes,
        exactCopies: 2,
        keyboardArrows: true,
        focus,
        geometry,
        screenshot,
      })
    }
  await evaluate(
    `document.querySelector('a[href="/docs#mode-powershell"]').click()`,
  )
  await evaluate(
    `new Promise((r,reject)=>{let n=0;function poll(){if(location.pathname==='/docs'&&document.querySelector('.docs-mode'))r();else if(n++<100)setTimeout(poll,20);else reject('docs navigation timeout')}poll()})`,
  )
  assert.equal(
    await evaluate(`document.querySelectorAll('.docs-code').length`),
    24,
  )
  assert.deepEqual(errors, [])
  assert.deepEqual(failures, [])
  assert(
    requests.every(
      (url) => url.startsWith(origin) && !/\/api\/|\/ws\//.test(url),
    ),
  )
  console.log(
    JSON.stringify(
      {
        results,
        docsPanels: 24,
        errors,
        failures,
        requestCount: requests.length,
        protectedRequests: 0,
      },
      null,
      2,
    ),
  )
} finally {
  await browser.close()
}
