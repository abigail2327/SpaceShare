import { useCallback, useEffect, useState } from 'react'
import { getMe, logout as authLogout } from './auth.js'
import { isAuthenticated, clearTokens } from './tokens.js'
import { mapUserFromApi } from './mappers.js'

export function useCurrentUser() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    if (!isAuthenticated()) {
      setUser(null)
      setLoading(false)
      return
    }
    setLoading(true)
    getMe()
      .then((data) => {
        if (!cancelled) setUser(mapUserFromApi(data))
      })
      .catch(() => {
        // Access token invalid/expired and refresh failed — treat as signed out.
        if (!cancelled) {
          clearTokens()
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tick])

  function logout() {
    authLogout()
    refresh()
  }

  return { user, loading, refresh, logout, tick }
}
