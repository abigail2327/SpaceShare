import { request } from './apiClient.js'
import { setTokens, clearTokens } from './tokens.js'

export async function register(payload) {
  const data = await request('/api/auth/register/', { method: 'POST', body: payload, auth: false })
  setTokens({ access: data.access, refresh: data.refresh })
  return data.user
}

export async function login(email, password) {
  const data = await request('/api/auth/login/', { method: 'POST', body: { email, password }, auth: false })
  setTokens({ access: data.access, refresh: data.refresh })
  return data.user
}

export function logout() {
  clearTokens()
}

export async function getMe() {
  return request('/api/auth/me/')
}

export async function updateMe(patch) {
  return request('/api/auth/me/', { method: 'PATCH', body: patch })
}
