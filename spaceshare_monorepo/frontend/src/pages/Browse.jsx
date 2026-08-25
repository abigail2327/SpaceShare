import { useEffect, useMemo, useState } from 'react'
import ListingCard from '../components/ListingCard.jsx'
import { getListings, FIELD_LABELS } from '../lib/store.js'
import { useAsync } from '../lib/hooks.js'
import { useLiveLocation } from '../lib/useLiveLocation.js'
import { distanceKm } from '../lib/geo.js'
import { IconNavigation, IconMapPin, IconCalendar, IconUsers } from '../components/Icons.jsx'

const emptyFilters = { area: '', date: '', price: 'any', field: 'any', womenOnly: false }

export default function Browse({ user }) {
  const [filters, setFilters] = useState(emptyFilters)
  const [debouncedArea, setDebouncedArea] = useState('')
  const [nearMe, setNearMe] = useState(false)
  const { coords, label, status, locate } = useLiveLocation()

  // Debounce the free-text area field so we're not firing a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedArea(filters.area), 300)
    return () => clearTimeout(t)
  }, [filters.area])

  const queryFilters = { ...filters, area: debouncedArea }
  const { data: listings, loading, error } = useAsync(
    () => getListings(queryFilters),
    [JSON.stringify(queryFilters)]
  )

  const sorted = useMemo(() => {
    if (!listings) return []
    if (nearMe && coords) {
      return [...listings].sort(
        (a, b) =>
          distanceKm(coords.lat, coords.lng, a.lat, a.lng) - distanceKm(coords.lat, coords.lng, b.lat, b.lng)
      )
    }
    return listings
  }, [listings, nearMe, coords])

  function toggleNearMe() {
    if (!nearMe && !coords) locate()
    setNearMe((v) => !v)
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-paper px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-medium text-ink">
              Hey {user.name.split(' ')[0]}, here's what's open this week
            </h1>
            <p className="mt-1 text-sm text-ink/50">
              {loading ? 'Loading sessions…' : `${sorted.length} sessions currently listed.`}
            </p>
          </div>

          <button
            onClick={toggleNearMe}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              nearMe ? 'border-gold bg-goldlight text-[#7A5C17]' : 'border-line bg-white text-ink/70 hover:border-ink/25'
            }`}
          >
            <IconNavigation className="h-4 w-4" />
            {status === 'locating' ? 'Locating…' : nearMe ? `Sorted near ${label || 'you'}` : 'Sort by distance'}
          </button>
        </div>

        {/* filter bar */}
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 shadow-soft sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
          <FilterField label="Area" icon={<IconMapPin className="h-4 w-4" />}>
            <input
              value={filters.area}
              onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value }))}
              placeholder="e.g. JBR"
              className="input"
            />
          </FilterField>
          <FilterField label="Date" icon={<IconCalendar className="h-4 w-4" />}>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
              className="input"
            />
          </FilterField>
          <FilterField label="Price">
            <select value={filters.price} onChange={(e) => setFilters((f) => ({ ...f, price: e.target.value }))} className="input">
              <option value="any">Any</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </FilterField>
          <FilterField label="Field" icon={<IconUsers className="h-4 w-4" />}>
            <select value={filters.field} onChange={(e) => setFilters((f) => ({ ...f, field: e.target.value }))} className="input">
              <option value="any">Any</option>
              {Object.entries(FIELD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </FilterField>
          <label className="flex items-center gap-2 pb-2.5 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={filters.womenOnly}
              onChange={(e) => setFilters((f) => ({ ...f, womenOnly: e.target.checked }))}
              className="h-4 w-4 rounded border-line text-gold focus:ring-gold"
            />
            Women-only
          </label>
          {JSON.stringify(filters) !== JSON.stringify(emptyFilters) && (
            <button
              onClick={() => setFilters(emptyFilters)}
              className="pb-2.5 text-sm font-medium text-clay underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>

        {error && (
          <div className="mt-8 rounded-2xl border border-clay/30 bg-claylight p-4 text-sm text-clay">{error}</div>
        )}

        {!error && !loading && sorted.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-14 text-center">
            <p className="font-display text-xl text-ink/70">Nothing matches yet</p>
            <p className="mt-1 text-sm text-ink/50">Try widening your search, or host a session yourself.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
              : sorted.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} userLocation={nearMe ? coords : null} />
                ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FilterField({ label, icon, children }) {
  return (
    <label className="flex flex-1 min-w-[9rem] flex-col gap-1.5 text-sm">
      <span className="flex items-center gap-1.5 text-xs font-medium text-ink/55">
        {icon}
        {label}
      </span>
      {children}
    </label>
  )
}

function CardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-line bg-white">
      <div className="h-44 bg-sand" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-4 w-3/4 rounded bg-sand" />
        <div className="h-3 w-1/2 rounded bg-sand" />
        <div className="h-6 w-2/3 rounded-full bg-sand" />
      </div>
    </div>
  )
}
