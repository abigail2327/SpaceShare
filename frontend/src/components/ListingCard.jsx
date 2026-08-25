import { Link } from 'react-router-dom'
import Tag from './Tag.jsx'
import Avatar from './Avatar.jsx'
import { RatingBadge } from './Stars.jsx'
import { FIELD_LABELS } from '../lib/store.js'
import { distanceKm, formatDistance } from '../lib/geo.js'

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function ListingCard({ listing, userLocation }) {
  const isFull = listing.seatsAvailable <= 0

  const distance = userLocation
    ? formatDistance(distanceKm(userLocation.lat, userLocation.lng, listing.lat, listing.lng))
    : null

  return (
    <Link
      to={`/listing/${listing.id}`}
      className="card group flex flex-col overflow-hidden shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative h-44 w-full overflow-hidden bg-sand">
        <img
          src={listing.image}
          alt={listing.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <RatingBadge average={listing.host?.averageRating} count={listing.host?.ratingCount} />
          {isFull && (
            <span className="rounded-full glass px-2.5 py-1 text-xs font-medium text-ink/80 shadow-soft">Full</span>
          )}
        </div>
        {distance && (
          <span className="absolute bottom-3 left-3 rounded-full glass px-2.5 py-1 text-xs font-medium text-ink/80 shadow-soft">
            {distance}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-display text-base font-medium leading-snug text-ink">{listing.title}</h3>
          <p className="mt-0.5 text-xs text-ink/50">{listing.area}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Tag tone="clay">{FIELD_LABELS[listing.field] || listing.field}</Tag>
          {listing.womenOnly && <Tag tone="forest">Women-only</Tag>}
          <Tag tone="gold">{listing.price === 0 ? 'Free' : `AED ${listing.price}`}</Tag>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-xs text-ink/60">
          <span>
            {formatDate(listing.date)} · {listing.startTime}
          </span>
          <span>{listing.seatsAvailable} left</span>
        </div>

        <div className="flex items-center gap-2">
          <Avatar name={listing.host?.name || ''} size={24} />
          <span className="text-xs font-medium text-ink/70">{listing.host?.name}</span>
        </div>
      </div>
    </Link>
  )
}
