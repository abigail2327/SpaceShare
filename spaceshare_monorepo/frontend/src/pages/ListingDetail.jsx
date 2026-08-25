import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Tag from '../components/Tag.jsx'
import Avatar from '../components/Avatar.jsx'
import { StarsDisplay } from '../components/Stars.jsx'
import LocationMap from '../components/LocationMap.jsx'
import Modal from '../components/Modal.jsx'
import {
  IconWifi,
  IconPaw,
  IconChild,
  IconUtensils,
  IconParking,
  IconMoon,
  IconCompass,
  IconCalendar,
  IconClock,
  IconCheck,
} from '../components/Icons.jsx'
import { getListing, getBookingsForGuest, requestBooking, AMENITY_LABELS, FIELD_LABELS } from '../lib/store.js'
import { useAsync } from '../lib/hooks.js'

const AMENITY_ICONS = {
  wifi: IconWifi,
  petFriendly: IconPaw,
  kidFriendly: IconChild,
  lunch: IconUtensils,
  parking: IconParking,
  quiet: IconMoon,
  prayerRoom: IconCompass,
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function ListingDetail({ user }) {
  const { id } = useParams()
  const { data: listing, loading, error: loadError, reload: reloadListing } = useAsync(() => getListing(id), [id])
  const { data: myBookings, reload: reloadBookings } = useAsync(() => getBookingsForGuest(), [])

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  if (loading) {
    return <div className="px-4 py-16 text-center text-sm text-ink/50">Loading listing…</div>
  }

  if (loadError || !listing) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-paper px-4 py-16 text-center">
        <p className="mx-auto inline-block rounded-2xl border border-line bg-white p-6 shadow-soft">
          {loadError || 'Listing not found.'}{' '}
          <Link to="/" className="text-clay underline">
            Back to browse
          </Link>
        </p>
      </div>
    )
  }

  const isHost = listing.hostId === user.id
  const myBooking = (myBookings || []).find(
    (b) => b.listingId === listing.id && b.status !== 'declined' && b.status !== 'cancelled'
  )
  const addressUnlocked = isHost || myBooking?.status === 'accepted' || myBooking?.status === 'completed'

  async function handleRequest(e) {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      await requestBooking({ listingId: listing.id, message })
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  function closeModal() {
    setModalOpen(false)
    if (sent) {
      setSent(false)
      setMessage('')
      reloadListing()
      reloadBookings()
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-paper px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
          <div className="relative h-64 w-full sm:h-80">
            <img src={listing.image} alt={listing.title} className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-5 sm:p-7">
              <div className="flex flex-wrap gap-1.5">
                <Tag tone="clay">{FIELD_LABELS[listing.field] || listing.field}</Tag>
                {listing.womenOnly && <Tag tone="forest">Women-only</Tag>}
                <Tag tone="gold">{listing.price === 0 ? 'Free' : `AED ${listing.price}`}</Tag>
              </div>
              <h1 className="mt-3 font-display text-3xl font-medium text-white sm:text-4xl">{listing.title}</h1>
              <p className="mt-1 flex items-center gap-3 text-sm text-white/85">
                <span className="inline-flex items-center gap-1.5">
                  <IconCalendar className="h-4 w-4" /> {formatDate(listing.date)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <IconClock className="h-4 w-4" /> {listing.startTime}–{listing.endTime}
                </span>
              </p>
            </div>
          </div>

          <div className="grid gap-8 p-6 sm:grid-cols-3 sm:p-8">
            <div className="flex flex-col gap-7 sm:col-span-2">
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Location</h2>
                <p className="mt-1.5 text-ink/70">
                  {addressUnlocked ? listing.address : `${listing.area} — exact address shared once your request is accepted`}
                </p>
                <LocationMap
                  lat={listing.lat}
                  lng={listing.lng}
                  label={listing.area}
                  locked={!addressUnlocked}
                  className="mt-3 h-56 w-full"
                />
              </section>

              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Amenities</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {listing.amenities.map((a) => {
                    const Icon = AMENITY_ICONS[a]
                    return (
                      <Tag key={a} tone="outline" icon={Icon ? <Icon /> : null}>
                        {AMENITY_LABELS[a] || a}
                      </Tag>
                    )
                  })}
                </div>
              </section>

              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/45">House rules</h2>
                <p className="mt-1.5 whitespace-pre-line text-ink/70">{listing.houseRules || '—'}</p>
              </section>

              <section className="rounded-2xl border border-line bg-paper p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Hosted by</h2>
                <div className="mt-2 flex items-center gap-3">
                  <Avatar name={listing.host?.name || ''} size={44} />
                  <div>
                    <p className="font-medium text-ink">{listing.host?.name}</p>
                    <StarsDisplay average={listing.host?.averageRating} count={listing.host?.ratingCount} />
                  </div>
                </div>
              </section>
            </div>

            <aside className="h-fit rounded-2xl border border-line bg-white p-4 shadow-soft">
              <p className="text-sm text-ink/60">
                {listing.seatsAvailable} of {listing.seatsTotal} seats left
              </p>

              {isHost ? (
                <div className="mt-4 rounded-xl bg-forestlight p-3 text-sm text-forest">
                  This is your listing. Manage requests from{' '}
                  <Link to="/requests" className="underline underline-offset-2">
                    Requests
                  </Link>
                  .
                </div>
              ) : myBooking ? (
                <div className="mt-4 rounded-xl bg-goldlight p-3 text-sm text-[#7A5C17]">
                  Your request is <strong>{myBooking.status}</strong>.
                  {myBooking.status === 'pending' && ' Waiting on the host.'}
                  {myBooking.status === 'accepted' && ' Address unlocked above.'}
                </div>
              ) : listing.seatsAvailable <= 0 ? (
                <div className="mt-4 rounded-xl bg-sand p-3 text-sm text-ink/60">Fully booked.</div>
              ) : (
                <button
                  onClick={() => setModalOpen(true)}
                  className="mt-4 w-full rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-ink shadow-soft hover:bg-gold/90"
                >
                  Request to book
                </button>
              )}
            </aside>
          </div>
        </div>
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={sent ? 'Request sent' : 'Request to book'}>
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forestlight text-forest">
              <IconCheck className="h-6 w-6" />
            </span>
            <p className="text-sm text-ink/70">
              Your request for <span className="font-medium text-ink">{listing.title}</span> has been sent to{' '}
              {listing.host?.name}. You'll get a notification as soon as they respond.
            </p>
            <button onClick={closeModal} className="mt-1 w-full rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleRequest} className="flex flex-col gap-3">
            <p className="text-sm text-ink/60">
              {formatDate(listing.date)} · {listing.startTime}–{listing.endTime}
            </p>
            <label className="text-sm font-medium text-ink/70">Message to host (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="input"
              placeholder="Hi! I'm a backend engineer, would love to join."
              autoFocus
            />
            {error && <p className="text-sm text-clay">{error}</p>}
            <button
              type="submit"
              disabled={sending}
              className="mt-1 rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-ink shadow-soft hover:bg-gold/90 disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Submit request'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  )
}
