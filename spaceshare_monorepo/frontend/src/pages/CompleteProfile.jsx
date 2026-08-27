import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FIELD_LABELS } from '../lib/store.js'
import { updateMe } from '../lib/auth.js'
import { mapUserToApi } from '../lib/mappers.js'

export default function CompleteProfile({ user, refresh }) {
  const navigate = useNavigate()
  const [area, setArea] = useState(user.area || '')
  const [fieldTag, setFieldTag] = useState(user.fieldTag || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await updateMe(mapUserToApi({ area, fieldTag }))
      refresh()
      navigate('/')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-paper px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-white p-8 shadow-soft">
        <h1 className="font-display text-2xl font-medium text-ink">Complete your profile</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/55">
          Add a couple of details to help people find the right workspace. You can update these later.
        </p>
        <form onSubmit={save} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink/75">Area</span>
            <input value={area} onChange={(event) => setArea(event.target.value)} className="input" placeholder="JBR, Dubai" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink/75">Field / industry</span>
            <select value={fieldTag} onChange={(event) => setFieldTag(event.target.value)} className="input">
              <option value="">Prefer not to say</option>
              {Object.entries(FIELD_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          {error && <p className="text-sm text-clay">{error}</p>}
          <button type="submit" disabled={saving} className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-ink disabled:opacity-60">
            {saving ? 'Saving…' : 'Continue'}
          </button>
          <button type="button" onClick={() => navigate('/')} className="text-sm text-ink/55 hover:text-ink">
            Skip for now
          </button>
        </form>
      </div>
    </div>
  )
}
