import { toCamel, toSnake } from './caseUtils.js'
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './tokens.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

let refreshPromise = null

async function refreshAccessToken() {
  const refresh = getRefreshToken()
  if (!refresh) throw new ApiError('Not signed in.', 401)

  // Coalesce concurrent refresh attempts (e.g. two requests firing 401 at
  // once) into a single network call.
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/api/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
      .then(async (res) => {
        if (!res.ok) throw new ApiError('Session expired.', res.status)
        const data = await res.json()
        setTokens({ access: data.access })
        return data.access
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

/**
 * request('/api/listings/', { method: 'POST', body: { title: 'x' } })
 * - `body` is a plain JS object in camelCase; converted to snake_case JSON.
 * - Response JSON is converted back to camelCase before being returned.
 * - `auth: false` skips attaching the Authorization header (for
 *   register/login where there's no token yet).
 */
export async function request(path, { method = 'GET', body, auth = true, isRetry = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(toSnake(body)) : undefined,
  })

  if (res.status === 401 && auth && !isRetry) {
    try {
      await refreshAccessToken()
      return request(path, { method, body, auth, isRetry: true })
    } catch {
      clearTokens()
      throw new ApiError('Your session has expired. Please sign in again.', 401)
    }
  }

  if (res.status === 204) return null

  let data = null
  try {
    data = await res.json()
  } catch {
    // no body
  }

  if (!res.ok) {
    const message = data?.detail || summarizeFieldErrors(data) || `Request failed (${res.status}).`
    throw new ApiError(message, res.status)
  }

  return toCamel(data)
}

// DRF validation errors come back as { field: ["message"] } rather than
// { detail }. Flatten the first one into something readable.
function summarizeFieldErrors(data) {
  if (!data || typeof data !== 'object') return null
  const firstKey = Object.keys(data)[0]
  if (!firstKey) return null
  const value = data[firstKey]
  const message = Array.isArray(value) ? value[0] : value
  return typeof message === 'string' ? message : null
}

export { ApiError, API_BASE }
