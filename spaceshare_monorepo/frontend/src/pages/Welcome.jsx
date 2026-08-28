import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FIELD_LABELS } from '../lib/store.js'
import { useLiveLocation } from '../lib/useLiveLocation.js'
import LocationMap from '../components/LocationMap.jsx'
import { IconWifi, IconShield, IconClock, IconNavigation, IconArrowRight } from '../components/Icons.jsx'
import GoogleLoginButton from '../components/GoogleLoginButton.jsx'

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1604328727766-a151d1045ab4?auto=format&fit=crop&w=1800&q=80'

export default function Welcome({ refresh }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { coords, label, status, error: locError, locate } = useLiveLocation()

  useEffect(() => {
    if (location.hash !== '#sign-up') return
    requestAnimationFrame(() => {
      document.getElementById('sign-up')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [location.hash])

  return (
    <div className="min-h-[calc(100vh-64px)] bg-paper px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        {/* ---------------------------------------------------------- hero */}
        <section className="relative overflow-hidden rounded-[2rem] border border-line shadow-lift">
          <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/35 to-ink/10" />

          <div className="relative flex min-h-[440px] flex-col justify-between px-6 py-8 sm:px-12 sm:py-10">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full glass-dark px-3 py-1.5 text-xs font-medium text-white">
                <IconShield className="h-3.5 w-3.5" /> Verified hosts only
              </span>
              {coords && (
                <span className="hidden items-center gap-1.5 rounded-full glass-dark px-3 py-1.5 text-xs font-medium text-white sm:inline-flex">
                  {label || 'Locating…'}
                </span>
              )}
            </div>

            <div className="max-w-xl">
              <h1 className="font-display text-4xl font-medium leading-[1.08] text-white sm:text-5xl">
                Work from someone's <span className="italic text-goldlight">living room</span> instead of
                your desk.
              </h1>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/80">
                Skip the co-working membership and the coffee-shop markup. Host a session in your own
                space, or join one happening near you today.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full glass-dark px-3 py-1.5 text-xs font-medium text-white">
                <IconWifi className="h-3.5 w-3.5" /> Fast wifi everywhere
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full glass-dark px-3 py-1.5 text-xs font-medium text-white">
                <IconClock className="h-3.5 w-3.5" /> Flexible hours
              </span>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- live location */}
        <section className="mt-4 flex flex-col items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-goldlight text-[#7A5C17]">
              <IconNavigation className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">
                {status === 'ready' ? `You're near ${label || 'your current location'}` : 'See sessions closest to you'}
              </p>
              <p className="text-xs text-ink/50">
                {status === 'error' ? locError : 'Uses your device location — nothing is stored until you say so.'}
              </p>
            </div>
          </div>
          <button
            onClick={locate}
            disabled={status === 'locating'}
            className="shrink-0 rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-sand disabled:opacity-60"
          >
            {status === 'locating' ? 'Locating…' : status === 'ready' ? 'Update location' : 'Use my location'}
          </button>
        </section>

        {coords && (
          <section className="mt-4">
            <LocationMap lat={coords.lat} lng={coords.lng} label={label} className="h-52 w-full" />
          </section>
        )}

        {/* ------------------------------------------------------ auth card */}
        <div id="sign-up" className="scroll-mt-24 mx-auto mt-10 max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-soft">
          <h2 className="font-display text-2xl font-medium text-ink">Join SpaceShare</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/55">
            Sign in with Google to find a workspace or host your own session.
          </p>
          <div className="mt-6 flex justify-center">
            <GoogleLoginButton
              onSuccess={(googleUser) => {
                window.location.assign(googleUser.area && googleUser.fieldTag ? '/' : '/complete-profile')
              }}
            />
          </div>
          <p className="mt-4 text-xs text-ink/45">You can complete your profile after signing in.</p>
        </div>
      </div>
    </div>
  )
}

function SignupForm({ refresh, navigate, liveArea, onLocate }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    area: '',
    bio: '',
    linkedin: '',
    field: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      setError('Name, email, and a password of at least 8 characters are required.')
      return
    }
    setError('')
    setSubmitting(true)
    const [firstName, ...rest] = form.name.trim().split(/\s+/)
    try {
      await register({
        email: form.email,
        password: form.password,
        firstName,
        lastName: rest.join(' '),
        bio: form.bio,
        linkedinUrl: form.linkedin,
        area: form.area || liveArea,
        fieldTag: form.field,
      })
      refresh()
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-2xl font-medium text-ink">Create your profile</h2>
        <p className="mt-1 text-sm text-ink/50">Takes under a minute.</p>
      </div>

      <Field label="Full name">
        <input required value={form.name} onChange={(e) => update('name', e.target.value)} className="input" placeholder="Amina K." />
      </Field>
      <Field label="Email">
        <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="input" placeholder="you@example.com" />
      </Field>
      <Field label="Password">
        <input required type="password" minLength={8} value={form.password} onChange={(e) => update('password', e.target.value)} className="input" placeholder="At least 8 characters" />
      </Field>
      <Field label="Area">
        <div className="flex gap-2">
          <input value={form.area} onChange={(e) => update('area', e.target.value)} className="input" placeholder={liveArea || 'JBR, Dubai'} />
          <button type="button" onClick={onLocate} className="shrink-0 rounded-xl border border-line bg-white px-3 text-ink/60 hover:bg-sand" title="Use my current location">
            <IconNavigation className="h-4 w-4" />
          </button>
        </div>
      </Field>
      <Field label="Field / industry">
        <select value={form.field} onChange={(e) => update('field', e.target.value)} className="input">
          <option value="">Prefer not to say</option>
          {Object.entries(FIELD_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </Field>
      <Field label="Short bio">
        <textarea value={form.bio} onChange={(e) => update('bio', e.target.value)} className="input" rows={3} placeholder="What do you do, and what are you looking for?" />
      </Field>
      <Field label="LinkedIn (optional trust signal)">
        <input value={form.linkedin} onChange={(e) => update('linkedin', e.target.value)} className="input" placeholder="linkedin.com/in/you" />
      </Field>

      <div className="divider">or</div>
      <GoogleLoginButton onSuccess={() => navigate('/dashboard')} />

      {error && <p className="text-sm text-clay">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-ink shadow-soft hover:bg-gold/90 disabled:opacity-60"
      >
        {submitting ? 'Creating account…' : 'Create profile & continue'}
        <IconArrowRight className="h-4 w-4" />
      </button>
    </form>
  )
}

function LoginForm({ refresh, navigate }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      refresh()
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-2xl font-medium text-ink">Welcome back</h2>
        <p className="mt-1 text-sm text-ink/50">Sign in to your SpaceShare account.</p>
      </div>
      <Field label="Email">
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
      </Field>
      <Field label="Password">
        <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
      </Field>
      {error && <p className="text-sm text-clay">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-ink shadow-soft hover:bg-gold/90 disabled:opacity-60"
      >
        {submitting ? 'Signing in…' : 'Sign in'}
        <IconArrowRight className="h-4 w-4" />
      </button>
    </form>
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
