export async function dashboardChecks(page, origin, fixture, capture, assert) {
  const button = (name) => page.getByRole('button', { name, exact: true })
  const visible = (text) =>
    page.getByText(text, { exact: true }).first().waitFor()
  const input = page.getByRole('textbox', { name: 'Repository ID' })
  const repoPath = '/api/repositories/' + fixture.populated
  async function login() {
    const identity = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/me' &&
        response.status() === 200,
    )
    await page.goto(
      origin + '/api/auth/oauth-complete?code=pass11a-local-browser',
    )
    await identity
    await visible('local-browser-owner')
    await input.waitFor()
  }
  async function open(id) {
    await input.fill(id)
    await button('Open repository').click()
  }
  await login()
  await open('invalid')
  await visible(
    'Enter a valid repository ID (repo_ followed by 16–32 lowercase letters or digits).',
  )

  // Hold the old repository read at the local browser boundary, then select a newer ID.
  let release, entered
  const hold = new Promise((resolve) => {
    release = resolve
  })
  const started = new Promise((resolve) => {
    entered = resolve
  })
  const delayed = async (route) => {
    entered()
    await hold
    await route.continue().catch(() => {})
  }
  await page.route(origin + repoPath, delayed)
  await open(fixture.populated)
  await started
  await page
    .getByRole('status')
    .filter({ hasText: 'Loading…' })
    .first()
    .waitFor()
  await open(fixture.empty)
  release()
  await page.unroute(origin + repoPath, delayed)
  await visible('Empty HEAD. This repository has no commits yet.')
  assert(
    (await page
      .getByText('Browser inspection workspace', { exact: true })
      .count()) === 0,
    'Obsolete lookup cannot replace empty workspace',
  )
  await capture('empty-head')

  await open(fixture.populated)
  await visible('HEAD version 5')
  await visible('Resolve the local import')
  await page
    .getByRole('heading', { name: 'Browser inspection workspace' })
    .scrollIntoViewIfNeeded()
  await capture('populated-head')
  await button('Next file page').click()
  await button('src/main.ts').waitFor()
  await button('First file page').click()
  await button('notes.txt').click()
  const source = page
    .getByRole('region', { name: 'File preview' })
    .locator('pre code')
  await source.waitFor()
  assert(
    (await source.textContent()) === '<b>literal text</b>\n',
    'Source rendered verbatim',
  )
  assert((await source.locator('b').count()) === 0, 'Source markup is inert')
  await capture('committed-file')
  await button('Open parent commit').click()
  await visible('Initial snapshot with unresolved import')
  assert((await source.count()) === 0, 'Selecting parent clears earlier file')
  await button('Return to HEAD').click()
  await visible('Resolve the local import')

  await button('Next job page').click()
  await button('First job page').click()
  const receiptPath =
    origin + repoPath + '/ci/jobs/' + fixture.failed + '/receipt'
  // Replay an actual HTTP 409 captured from this Worker during job execution.
  await page.route(
    receiptPath,
    (route) => route.fulfill({ status: 409, json: fixture.pending }),
    { times: 1 },
  )
  await button('Inspect job ' + fixture.failed).click()
  await visible('Receipt pending. Refresh after the CI job settles.')
  await page
    .getByRole('heading', { name: 'Durable receipt' })
    .scrollIntoViewIfNeeded()
  await capture('pending-receipt')
  await button('Refresh receipt').click()
  await visible('Receipt: failed')
  await page.getByText(/imports\/missing_import/).waitFor()
  await page
    .getByText('Receipt: failed', { exact: true })
    .scrollIntoViewIfNeeded()
  await capture('failed-receipt')
  await button('Next job page').click()
  await button('Inspect job ' + fixture.passed).click()
  await visible('Receipt: passed')
  await visible('typescript: deferred')
  await page
    .getByText('Receipt: passed', { exact: true })
    .scrollIntoViewIfNeeded()
  await capture('passing-receipt')
  await button('First job page').click()
  await button('Inspect job ' + fixture.failed).click()
  await visible('Receipt: failed')

  await open(fixture.foreign)
  await visible('Access denied. This resource belongs to another account.')
  assert(
    (await page.getByText('Foreign workspace', { exact: true }).count()) === 0,
    'Foreign metadata is hidden',
  )
  await open('repo_' + '0'.repeat(32))
  await visible('This resource was not found.')
  await capture('missing-repository')
  await open(fixture.populated)
  await visible('HEAD version 5')
  await button('Sign out').click()
  await page
    .getByRole('heading', { name: 'Version control built for coding agents.' })
    .waitFor()
  await page.goto(origin + '/dashboard')
  await visible('Sign in to continue.')
  assert(
    (await input.count()) === 0 &&
      (await page.getByText('HEAD version 5').count()) === 0,
    'Sign-out removes protected state',
  )

  await login()
  await open(fixture.populated)
  await visible('HEAD version 5')
  await page.clock.fastForward(11 * 60 * 1000)
  await visible('Your session has expired. Sign in again.')
  assert(
    (await input.count()) === 0 &&
      (await page.getByText('HEAD version 5').count()) === 0,
    'Expiry removes protected state',
  )
  await capture('session-expired')
}
