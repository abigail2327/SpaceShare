// ---------------------------------------------------------------------------
// Location utilities.
//
// Live location uses the browser's own Geolocation API (free, key-less).
// Reverse geocoding uses OpenStreetMap's Nominatim service (free, key-less,
// suitable for occasional lookups like this). Map display uses Google Maps'
// public embed endpoint (google.com/maps?...&output=embed), which renders an
// interactive map without requiring a billing-enabled API key.
// ---------------------------------------------------------------------------

function toRad(value) {
  return (value * Math.PI) / 180
}

export function distanceKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v === null || v === undefined || Number.isNaN(v))) {
    return null
  }
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function formatDistance(km) {
  if (km === null || km === undefined) return null
  if (km < 1) return `${Math.max(Math.round(km * 1000), 0)} m away`
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km away`
}

export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by this browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const messages = {
          1: 'Location access was denied.',
          2: 'Your location is currently unavailable.',
          3: 'Locating you timed out.',
        }
        reject(new Error(messages[err.code] || 'Could not get your location.'))
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000, ...options }
    )
  })
}

// Free, key-less reverse geocoding via OpenStreetMap Nominatim.
export async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('Reverse geocoding failed.')
  const data = await res.json()
  const a = data.address || {}
  const area = a.suburb || a.neighbourhood || a.city_district || a.town || a.village
  const city = a.city || a.town || a.state
  const label = [area, city].filter(Boolean).join(', ') || data.display_name || 'Your location'
  return { label, raw: data }
}

// Google Maps public embed — renders a live, interactive map with no API key.
export function googleMapsEmbedUrl(lat, lng, zoom = 14) {
  return `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`
}

export function googleMapsLink(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}
