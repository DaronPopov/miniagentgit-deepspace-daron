declare const __DEEPSPACE_APP_ID__: string
/** Official build-injected identity only; never a hand-written fallback ID. */
export function authenticationConfigured(): boolean {
  return (
    typeof __DEEPSPACE_APP_ID__ === 'string' &&
    /^app_[0-9A-HJKMNP-TV-Z]{26}$/.test(__DEEPSPACE_APP_ID__)
  )
}
