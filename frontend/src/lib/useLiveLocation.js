import { useCallback, useState } from 'react'
import { getCurrentPosition, reverseGeocode } from './geo.js'

export function useLiveLocation() {
  const [coords, setCoords] = useState(null)
  const [label, setLabel] = useState('')
  const [status, setStatus] = useState('idle') // idle | locating | ready | error
  const [error, setError] = useState('')

  const locate = useCallback(async () => {
    setStatus('locating')
    setError('')
    try {
      const pos = await getCurrentPosition()
      setCoords(pos)
      setStatus('ready')
      reverseGeocode(pos.lat, pos.lng)
        .then((geo) => setLabel(geo.label))
        .catch(() => setLabel(''))
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Could not get your location.')
    }
  }, [])

  return { coords, label, status, error, locate }
}
