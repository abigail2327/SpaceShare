// ---------------------------------------------------------------------------
// Token storage.
//
// Access + refresh tokens live in localStorage. Trade-off, stated plainly:
// this is readable by any script running on the page (XSS risk) in exchange
// for simplicity and working cleanly across a separate-origin API without
// CSRF plumbing. An httpOnly-cookie-based refresh token is the safer
// production upgrade — swap it in apiClient.js without touching callers.
// ---------------------------------------------------------------------------

const ACCESS_KEY = 'spaceshare_access_token'
const REFRESH_KEY = 'spaceshare_refresh_token'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens({ access, refresh }) {
  if (access) localStorage.setItem(ACCESS_KEY, access)
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export function isAuthenticated() {
  return Boolean(getAccessToken())
}
