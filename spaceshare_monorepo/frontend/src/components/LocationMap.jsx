import { googleMapsEmbedUrl, googleMapsLink } from '../lib/geo.js'
import { IconLock } from './Icons.jsx'

export default function LocationMap({ lat, lng, label, zoom = 14, className = '', locked = false }) {
  if (lat === undefined || lat === null || lng === undefined || lng === null) return null

  if (locked) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-2xl border border-line bg-sand ${className}`}
      >
        <svg className="absolute inset-0 h-full w-full opacity-50" preserveAspectRatio="none">
          <defs>
            <pattern id="locked-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M28 0H0V28" fill="none" stroke="#E4DCCB" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#locked-grid)" />
        </svg>
        <div className="relative flex flex-col items-center gap-1.5 px-6 text-center text-ink/70">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-soft">
            <IconLock className="h-4 w-4" />
          </span>
          <p className="text-xs font-medium">Exact location shown after acceptance</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`map-frame overflow-hidden rounded-2xl border border-line ${className}`}>
      <iframe
        title={label || 'Map'}
        src={googleMapsEmbedUrl(lat, lng, zoom)}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}

export function MapLink({ lat, lng, children, className = '' }) {
  return (
    <a
      href={googleMapsLink(lat, lng)}
      target="_blank"
      rel="noreferrer"
      className={`underline underline-offset-2 ${className}`}
    >
      {children}
    </a>
  )
}
