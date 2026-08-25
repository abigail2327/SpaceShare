import { useCallback, useEffect, useState } from 'react'

/**
 * useAsync(() => getListings(filters), [filters])
 *
 * Runs `fn` whenever `deps` change, tracking loading/error/data. `reload()`
 * re-runs the same `fn` on demand (after a mutation) without waiting for a
 * dependency to change.
 */
export function useAsync(fn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)

  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fn()
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Something went wrong.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { data, loading, error, reload, setData }
}
