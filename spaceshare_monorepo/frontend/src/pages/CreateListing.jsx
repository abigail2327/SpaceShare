import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createListing, AMENITY_LABELS, FIELD_LABELS, COVER_OPTIONS } from '../lib/store.js'
import { useLiveLocation } from '../lib/useLiveLocation.js'
import { IconNavigation, IconCheck } from '../components/Icons.jsx'

export default function CreateListing({ user }) {
  const navigate = useNavigate()
  const { coords, label, status, locate } = useLiveLocation()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    area: user.area || '',
    address: '',
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    seatsTotal: 2,
    field: 'mixed',
    price: 0,
    womenOnly: false,
    amenities: [],
    houseRules: '',
    image: COVER_OPTIONS[0].url,
    lat: 25.2,
    lng: 55.27,
  })

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function toggleAmenity(key) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(key)
        ? f.amenities.filter((a) => a !== key)
        : [...f.amenities, key],
    }))
  }

  function useMyLocation() {
    locate()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.title.trim() || !form.date || !form.address.trim()) return
    setSubmitting(true)
    try {
      const listing = await createListing({
        ...form,
        lat: coords?.lat ?? form.lat,
        lng: coords?.lng ?? form.lng,
      })
      navigate(`/listing/${listing.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-paper px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-white p-6 shadow-soft sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold">Host a session</p>
        <h1 className="mt-1 font-display text-3xl font-medium text-ink">List your space</h1>
        <p className="mt-1 text-sm text-ink/50">Your exact address is only shared once you accept a request.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          <Field label="Title">
            <input
              required
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              className="input"
              placeholder="Quiet tech-friendly workspace in JBR"
            />
          </Field>

          <Field label="Cover photo">
            <div className="grid grid-cols-4 gap-2">
              {COVER_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => update('image', opt.url)}
                  className={`relative aspect-square overflow-hidden rounded-xl border-2 ${
                    form.image === opt.url ? 'border-gold' : 'border-transparent'
                  }`}
                  title={opt.label}
                >
                  <img src={opt.url} alt={opt.label} className="h-full w-full object-cover" />
                  {form.image === opt.url && (
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-ink">
                      <IconCheck className="h-3 w-3" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Area (shown publicly)">
              <input
                required
                value={form.area}
                onChange={(e) => update('area', e.target.value)}
                className="input"
                placeholder="JBR, Dubai"
              />
            </Field>
            <Field label="Exact address (shared after acceptance)">
              <input
                required
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                className="input"
                placeholder="Rimal 4, Apt 1203"
              />
            </Field>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-line bg-paper p-3">
            <button
              type="button"
              onClick={useMyLocation}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-sand"
            >
              <IconNavigation className="h-4 w-4" />
              {status === 'locating' ? 'Locating…' : 'Use my current location'}
            </button>
            <p className="text-xs text-ink/50">
              {coords
                ? `Pinned at ${label || `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`}`
                : 'Places the listing on the map for guests once accepted.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Date">
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Start">
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => update('startTime', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="End">
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => update('endTime', e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Seats">
              <input
                type="number"
                min={1}
                max={10}
                value={form.seatsTotal}
                onChange={(e) => update('seatsTotal', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Field / industry">
              <select value={form.field} onChange={(e) => update('field', e.target.value)} className="input">
                {Object.entries(FIELD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Price (AED, 0 = free)">
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => update('price', e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink/75">
            <input
              type="checkbox"
              checked={form.womenOnly}
              onChange={(e) => update('womenOnly', e.target.checked)}
              className="h-4 w-4 rounded border-line text-gold focus:ring-gold"
            />
            Women-only session
          </label>

          <Field label="Amenities">
            <div className="flex flex-wrap gap-2">
              {Object.entries(AMENITY_LABELS).map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => toggleAmenity(key)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    form.amenities.includes(key)
                      ? 'border-gold bg-goldlight text-[#7A5C17]'
                      : 'border-line bg-white text-ink/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="House rules (optional)">
            <textarea
              value={form.houseRules}
              onChange={(e) => update('houseRules', e.target.value)}
              rows={3}
              className="input"
              placeholder="Coffee break at 11 and 3. No calls after 6pm."
            />
          </Field>

          {error && <p className="rounded-xl bg-claylight px-3 py-2 text-sm text-clay">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 self-start rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink shadow-soft hover:bg-gold/90 disabled:opacity-60"
          >
            {submitting ? 'Publishing…' : 'Publish listing'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink/75">{label}</span>
      {children}
    </label>
  )
}
