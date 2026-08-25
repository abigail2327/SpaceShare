import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Tag from '../components/Tag.jsx'
import { StarsInput } from '../components/Stars.jsx'
import { getBookingsForGuest, updateBookingStatus, submitReview, getReviewsForBooking } from '../lib/store.js'
import { useAsync } from '../lib/hooks.js'

const STATUS_TONE = {
  pending: 'gold',
  accepted: 'forest',
  declined: 'outline',
  completed: 'clay',
  cancelled: 'outline',
}

export default function Bookings() {
  const [tab, setTab] = useState('upcoming')
  const { data: bookings, loading, error, reload } = useAsync(() => getBookingsForGuest(), [])

  const upcoming = (bookings || []).filter((b) => b.status === 'pending' || b.status === 'accepted')
  const past = (bookings || []).filter((b) => ['completed', 'declined', 'cancelled'].includes(b.status))
  const shown = tab === 'upcoming' ? upcoming : past

  async function cancel(bookingId) {
    await updateBookingStatus(bookingId, 'cancelled')
    reload()
  }

  async function complete(bookingId) {
    await updateBookingStatus(bookingId, 'completed')
    reload()
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-paper px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-medium text-ink">My bookings</h1>

        <div className="mt-4 flex gap-2">
          <TabButton active={tab === 'upcoming'} onClick={() => setTab('upcoming')}>
            Upcoming / active ({upcoming.length})
          </TabButton>
          <TabButton active={tab === 'past'} onClick={() => setTab('past')}>
            Past ({past.length})
          </TabButton>
        </div>

        {loading && <p className="mt-6 text-sm text-ink/50">Loading bookings…</p>}
        {error && <p className="mt-6 rounded-2xl border border-clay/30 bg-claylight p-4 text-sm text-clay">{error}</p>}

        {!loading && shown.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
            <p className="font-display text-xl text-ink/70">Nothing here yet</p>
            <p className="mt-1 text-sm">
              <Link to="/" className="text-clay underline">
                Browse open sessions
              </Link>
            </p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            {shown.map((b) => (
              <BookingCard key={b.id} booking={b} onCancel={() => cancel(b.id)} onComplete={() => complete(b.id)} reload={reload} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`rounded-full px-4 py-1.5 text-sm font-medium ${active ? 'bg-ink text-paper' : 'border border-line bg-white text-ink/70'}`}>
      {children}
    </button>
  )
}

function BookingCard({ booking, onCancel, onComplete, reload }) {
  const [showReview, setShowReview] = useState(false)
  const [existingReview, setExistingReview] = useState(null)

  useEffect(() => {
    if (booking.status !== 'completed') return
    let cancelled = false
    getReviewsForBooking(booking.id)
      .then((reviews) => {
        if (!cancelled) setExistingReview(reviews.find((r) => r.direction === 'guest_to_host') || null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [booking.id, booking.status])

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={`/listing/${booking.listingId}`} className="font-medium text-ink underline-offset-2 hover:underline">
            {booking.listingTitle}
          </Link>
          <p className="text-sm text-ink/55">
            {booking.listingDate} · Hosted by {booking.hostName}
          </p>
        </div>
        <Tag tone={STATUS_TONE[booking.status]}>{booking.status}</Tag>
      </div>

      {booking.status === 'pending' && (
        <button onClick={onCancel} className="mt-3 rounded-full border border-line px-4 py-1.5 text-sm text-ink/70 hover:bg-sand">
          Cancel request
        </button>
      )}

      {booking.status === 'accepted' && (
        <>
          <p className="mt-3 text-sm text-ink/60">Contact and exact address are now visible on the listing page.</p>
          <button onClick={onComplete} className="mt-2 rounded-full border border-line px-4 py-1.5 text-sm text-ink/70 hover:bg-sand">
            Mark session as completed
          </button>
        </>
      )}

      {booking.status === 'completed' && !existingReview && (
        <>
          <button
            onClick={() => setShowReview((s) => !s)}
            className="mt-3 rounded-full bg-gold px-4 py-1.5 text-sm font-semibold text-ink hover:bg-gold/90"
          >
            Rate {booking.hostName?.split(' ')[0]}'s space
          </button>
          {showReview && (
            <ReviewForm
              bookingId={booking.id}
              direction="guest_to_host"
              onDone={() => {
                setShowReview(false)
                reload()
              }}
            />
          )}
        </>
      )}
      {existingReview && (
        <p className="mt-3 text-sm text-ink/50">
          You rated this host {existingReview.rating}/5
          {existingReview.comment && ` — "${existingReview.comment}"`}
        </p>
      )}
    </div>
  )
}

function ReviewForm({ bookingId, direction, onDone }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      await submitReview({ bookingId, rating, comment, direction })
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-3 rounded-xl bg-paper p-3">
      <StarsInput value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Accurate listing, comfortable space, would return?"
        rows={2}
        className="input mt-2"
      />
      {error && <p className="mt-1 text-sm text-clay">{error}</p>}
      <button onClick={submit} disabled={submitting} className="mt-2 rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-paper disabled:opacity-60">
        {submitting ? 'Submitting…' : 'Submit review'}
      </button>
    </div>
  )
}
