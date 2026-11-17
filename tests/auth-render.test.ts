import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { AuthShell } from '../src/features/auth-ui/auth-shell'
import { AuthControls } from '../src/features/auth-ui/auth-controls'
import { sessionState } from '../src/features/auth-ui/session-state'
import Dashboard from '../src/pages/dashboard'
import { authenticationConfigured } from '../src/features/auth-ui/configuration'
import { DeepSpaceAuthProvider } from '../src/features/auth-ui/sdk'
import { AuthSession } from '../src/features/auth-ui/auth-session'
import { createApp } from '../src/server/app'

it('renders the real protected entry as unavailable without app configuration and makes no auth/API requests', () => {
  const fetch = vi.fn(() => {
    throw new Error('Unexpected request')
  })
  vi.stubGlobal('fetch', fetch)
  try {
    expect(authenticationConfigured()).toBe(false)
    const html = renderToStaticMarkup(createElement(Dashboard))
    expect(html).toContain('Authentication is unavailable')
    expect(html).toContain('href="/docs"')
    expect(html).not.toMatch(
      /<button|repository list|CI panel|Bearer|PRIVATE KEY/,
    )
    expect(fetch).not.toHaveBeenCalled()
  } finally {
    vi.unstubAllGlobals()
  }
})
it('sanitizes SDK state and explicitly renders all authentication states without credential data', () => {
  const input = {
    pending: false,
    failed: false,
    signedIn: true,
    subject: 'Alice',
    sessionId: 'opaque-session-id',
    expiresAt: 100,
  }
  expect(sessionState({ ...input, pending: true }, 1)).toEqual({
    status: 'loading',
  })
  expect(sessionState({ ...input, failed: true }, 1)).toEqual({
    status: 'error',
  })
  expect(sessionState({ ...input, signedIn: false }, 1)).toEqual({
    status: 'signed-out',
  })
  expect(sessionState(input, 101)).toEqual({ status: 'expired' })
  expect(sessionState({ ...input, expiresAt: NaN }, 1)).toEqual({
    status: 'error',
  })
  expect(sessionState(input, 1).status).toBe('signed-in')
  for (const status of [
    'loading',
    'signed-out',
    'expired',
    'error',
    'checking',
    'token-unavailable',
    'unavailable',
  ] as const)
    expect(
      renderToStaticMarkup(createElement(AuthShell, { state: { status } })),
    ).toContain('role="status"')
  const html = renderToStaticMarkup(
    createElement(AuthShell, {
      state: { status: 'signed-in', subject: '<Alice>' },
    }),
  )
  expect(html).toContain('&lt;Alice&gt;')
  expect(html).not.toContain('opaque-session-id')
})
it('keeps native sign-in/out actions accessible and explicit', async () => {
  const signIn = vi.fn(async () => {}),
    signOut = vi.fn(async () => {})
  const element = AuthControls({
    authenticated: false,
    busy: false,
    actions: { signIn, signOut },
    onAction: async (action) => action(),
  })
  const html = renderToStaticMarkup(element)
  expect(html).toContain('Continue with GitHub')
  expect(html).toContain('Continue with Google')
  element.props.children.props.children[0].props.onClick()
  element.props.children.props.children[1].props.onClick()
  expect(signIn).toHaveBeenNthCalledWith(1, 'github')
  expect(signIn).toHaveBeenNthCalledWith(2, 'google')
  expect(
    renderToStaticMarkup(
      createElement(AuthControls, {
        authenticated: true,
        busy: true,
        actions: { signIn, signOut },
        onAction: async (action) => action(),
      }),
    ),
  ).toContain('disabled=""')
  const signedOut = AuthControls({
    authenticated: true,
    busy: false,
    actions: { signIn, signOut },
    onAction: async (action) => action(),
  })
  await signedOut.props.children.props.onClick()
  expect(signOut).toHaveBeenCalledOnce()
})
it('maps direct dashboard navigation to assets without permitting protected API access', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(
    async () => new Response('shell'),
  )
  const response = await createApp().request('/dashboard', undefined, {
    ASSETS: { fetch },
  })
  expect(response.status).toBe(200)
  const forwarded = fetch.mock.calls[0]?.[0]
  if (!(forwarded instanceof Request)) throw new Error('Missing asset request')
  expect(new URL(forwarded.url).pathname).toBe('/')
})

it('wires the real SDK provider and hooks into a browser-only loading shell without issuing requests during static rendering', () => {
  const fetch = vi.fn(() => {
    throw new Error('No network in static rendering')
  })
  vi.stubGlobal('window', { location: { origin: 'http://localhost' } })
  vi.stubGlobal('fetch', fetch)
  try {
    const html = renderToStaticMarkup(
      createElement(DeepSpaceAuthProvider, null, createElement(AuthSession)),
    )
    expect(html).toContain('Checking your session')
    expect(fetch).not.toHaveBeenCalled()
  } finally {
    vi.unstubAllGlobals()
  }
})
