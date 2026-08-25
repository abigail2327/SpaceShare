import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Tag from '../components/Tag.jsx'
import Avatar from '../components/Avatar.jsx'
import { StarsDisplay, StarsInput } from '../components/Stars.jsx'
import { getBookingsForHost, updateBookingStatus, submitReview, getReviewsForBooking } from '../lib/store.js'
import { useAsync } from '../lib/hooks.js'

const STATUS_TONE = {
  pending: 'gold',
  accepted: 'forest',
  declined: 'outline',
  completed: 'clay',
  cancelled: 'outline',
}

export default function Requests({ user }) {
  const { data: bookings, loading, error, reload } = useAsync(() => getBookingsForHost(), [])
  const pending = (bookings || []).filter((b) => b.status === 'pending')
  const others = (bookings || []).filter((b) => b.status !== 'pending')

  async function act(bookingId, status) {
    await updateBookingStatus(bookingId, status)
    reload()
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-paper px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-medium text-ink">Requests</h1>

        {loading && <p className="mt-6 text-sm text-ink/50">Loading requests…</p>}
        {error && <p className="mt-6 rounded-2xl border border-clay/30 bg-claylight p-4 text-sm text-clay">{error}</p>}

        {!loading && bookings?.length === 0 && (
          <p className="mt-6 rounded-2xl border border-line bg-white p-6 text-ink/60 shadow-soft">
            No booking requests yet.{' '}
            <Link to="/host" className="text-clay underline">
              Host a session
            </Link>{' '}
            to start getting them.
          </p>
        )}

        {pending.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/45">
              Needs your response ({pending.length})
            </h2>
            <div className="flex flex-col gap-4">
              {pending.map((b) => (
                <RequestCard key={b.id} booking={b} onAccept={() => act(b.id, 'accepted')} onDecline={() => act(b.id, 'declined')} />
              ))}
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/45">History</h2>
            <div className="flex flex-col gap-4">
              {others.map((b) => (
                <RequestCard key={b.id} booking={b} onComplete={() => act(b.id, 'completed')} reload={reload} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function RequestCard({ booking, onAccept, onDecline, onComplete, reload }) {
  const [showReview, setShowReview] = useState(false)
  const [existingReview, setExistingReview] = useState(null)

  useEffect(() => {
    if (booking.status !== 'completed') return
    let cancelled = false
    getReviewsForBooking(booking.id)
      .then((reviews) => {
        if (!cancelled) setExistingReview(reviews.find((r) => r.direction === 'host_to_guest') || null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [booking.id, booking.status])

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={booking.guest?.name || ''} size={40} />
          <div>
            <p className="font-medium text-ink">
              {booking.guest?.name}{' '}
              {booking.guest?.ratingCount === 0 && (
                <span className="ml-1 rounded-full bg-sand px-2 py-0.5 text-xs text-ink/50">New user</span>
              )}
            </p>
            <StarsDisplay average={booking.guest?.averageRating} count={booking.guest?.ratingCount} />
          </div>
        </div>
        <Tag tone={STATUS_TONE[booking.status]}>{booking.status}</Tag>
      </div>

      <p className="mt-3 text-sm text-ink/65">
        For{' '}
        <Link to={`/listing/${booking.listingId}`} className="underline underline-offset-2">
          {booking.listingTitle}
        </Link>{' '}
        on {booking.listingDate}
      </p>
      {booking.message && (
        <p className="mt-2 rounded-xl bg-paper p-3 text-sm italic text-ink/70">&ldquo;{booking.message}&rdquo;</p>
      )}

      {booking.status === 'pending' && (
        <div className="mt-3 flex gap-2">
          <button onClick={onAccept} className="rounded-full bg-forest px-4 py-1.5 text-sm font-medium text-white hover:bg-forest/90">
            Accept
          </button>
          <button onClick={onDecline} className="rounded-full border border-line px-4 py-1.5 text-sm text-ink/70 hover:bg-sand">
            Decline
          </button>
        </div>
      )}

      {booking.status === 'accepted' && onComplete && (
        <button onClick={onComplete} className="mt-3 rounded-full border border-line px-4 py-1.5 text-sm text-ink/70 hover:bg-sand">
          Mark session as completed
        </button>
      )}

      {booking.status === 'completed' && !existingReview && (
        <>
          <button
            onClick={() => setShowReview((s) => !s)}
            className="mt-3 rounded-full bg-gold px-4 py-1.5 text-sm font-semibold text-ink hover:bg-gold/90"
          >
            Rate {booking.guest?.name?.split(' ')[0]}
          </button>
          {showReview && (
            <ReviewForm
              bookingId={booking.id}
              direction="host_to_guest"
              onDone={() => {
                setShowReview(false)
                reload?.()
              }}
            />
          )}
        </>
      )}
      {existingReview && (
        <p className="mt-3 text-sm text-ink/50">
          You rated this guest {existingReview.rating}/5
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
        placeholder="Punctual, respectful, would host/join again?"
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
