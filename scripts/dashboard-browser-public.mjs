export async function publicChecks(page, origin, capture, assert) {
  await page.goto(origin)
  await page
    .getByRole('heading', { name: 'Version control built for coding agents.' })
    .waitFor()
  await page.keyboard.press('Tab')
  assert(
    await page.evaluate(() => {
      const focused = document.activeElement
      return (
        focused.textContent.trim() === 'Skip to content' &&
        getComputedStyle(focused).outlineWidth === '3px'
      )
    }),
    'Visible keyboard skip link',
  )
  await page.keyboard.press('Enter')
  assert(
    await page.evaluate(() => document.activeElement.id === 'main-content'),
    'Skip target',
  )
  await capture('landing')
  await page
    .getByRole('link', { name: 'Connect your coding agent', exact: true })
    .click()
  await page.locator('#connect').waitFor()
  assert(new URL(page.url()).hash === '#connect', 'Agent onboarding link')
  await capture('onboarding')
  await page.getByRole('link', { name: 'Read the docs' }).click()
  await page
    .getByRole('heading', { name: 'Connect through native MCP' })
    .waitFor()
  assert(
    (await page.locator('.docs-mcp-tools dt').count()) === 6,
    'All native tools',
  )
  await page.getByRole('link', { name: 'Native MCP', exact: true }).click()
  await capture('docs')
  await page.getByRole('link', { name: 'Account', exact: true }).click()
  await page.getByText('Sign in to continue.', { exact: true }).waitFor()
  assert(
    (await page.getByRole('textbox', { name: 'Repository ID' }).count()) === 0,
    'No repository controls appear signed out',
  )
  await capture('signed-out')
  const missing = await page.goto(origin + '/pass11b-missing')
  assert(missing.status() === 404, 'Unknown route returns 404')
  const denied = await page.goto(origin + '/api/me')
  assert(denied.status() === 401, 'Unauthorized API returns 401')
}
