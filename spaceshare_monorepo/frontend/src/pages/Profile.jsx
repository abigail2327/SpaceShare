import { useState } from 'react'
import { Link } from 'react-router-dom'
import Tag from '../components/Tag.jsx'
import Avatar from '../components/Avatar.jsx'
import { StarsDisplay } from '../components/Stars.jsx'
import { IconCheck } from '../components/Icons.jsx'
import { updateMe } from '../lib/auth.js'
import { mapUserToApi } from '../lib/mappers.js'
import { getListingsByHost } from '../lib/store.js'
import { useAsync } from '../lib/hooks.js'

export default function Profile({ user, refresh }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: user.name, bio: user.bio, linkedin: user.linkedin, area: user.area, phone: user.phone })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { data: myListings, loading } = useAsync(() => getListingsByHost(user.id), [user.id])

  async function save() {
    setSaving(true)
    setError('')
    try {
      await updateMe(mapUserToApi(form))
      refresh()
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-paper px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <Avatar name={user.name} size={64} />
              <div>
                <h1 className="font-display text-2xl font-medium text-ink">{user.name}</h1>
                <StarsDisplay average={user.averageRating} count={user.ratingCount} />
              </div>
            </div>
            {!editing && (
              <button onClick={() => setEditing(true)} className="rounded-full border border-line px-4 py-1.5 text-sm text-ink/70 hover:bg-sand">
                Edit profile
              </button>
            )}
          </div>

          {user.emailVerified && (
            <div className="mt-3">
              <Tag tone="forest" icon={<IconCheck />}>
                Email verified
              </Tag>
            </div>
          )}

          {editing ? (
            <div className="mt-5 flex flex-col gap-3">
              <Field label="Name">
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" />
              </Field>
              <Field label="Area">
                <input value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} className="input" />
              </Field>
              <Field label="Contact phone">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="input"
                  placeholder="+971501234567"
                />
              </Field>
              <Field label="Bio">
                <textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} rows={3} className="input" />
              </Field>
              <Field label="LinkedIn">
                <input value={form.linkedin} onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))} className="input" />
              </Field>
              {error && <p className="text-sm text-clay">{error}</p>}
              <div className="flex gap-2">
                <button onClick={save} disabled={saving} className="rounded-full bg-gold px-4 py-1.5 text-sm font-semibold text-ink disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)} className="rounded-full border border-line px-4 py-1.5 text-sm text-ink/70">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-2 text-sm">
              <p className="text-ink/70">{user.bio || 'No bio yet.'}</p>
              <p className="text-ink/50">{user.area}</p>
              {user.phone && <p className="text-ink/50">Contact: {user.phone}</p>}
              {user.linkedin && <p className="text-ink/50">LinkedIn: {user.linkedin}</p>}
            </div>
          )}
        </div>

        <div className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/45">Your listings</h2>
          {loading ? (
            <p className="text-sm text-ink/50">Loading…</p>
          ) : myListings?.length === 0 ? (
            <p className="text-sm text-ink/60">
              You haven't hosted a session yet.{' '}
              <Link to="/host" className="text-clay underline">
                Host one
              </Link>
              .
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {myListings?.map((l) => (
                <Link key={l.id} to={`/listing/${l.id}`} className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3 hover:bg-paper">
                  <span className="font-medium text-ink">{l.title}</span>
                  <span className="text-sm text-ink/50">{l.date}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
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
