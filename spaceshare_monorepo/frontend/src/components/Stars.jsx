import { IconStar } from './Icons.jsx'

export function StarsDisplay({ average, count, className = '' }) {
  if (!average) {
    return <span className={`text-sm text-ink/45 ${className}`}>New host · no reviews yet</span>
  }
  return (
    <span className={`inline-flex items-center gap-1 text-sm text-ink/80 ${className}`}>
      <IconStar filled className="h-4 w-4 text-gold" />
      <span className="font-semibold">{average}</span>
      <span className="text-ink/45">({count})</span>
    </span>
  )
}

export function RatingBadge({ average, count }) {
  if (!average) return null
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-sm font-semibold text-ink shadow-soft">
      <IconStar filled className="h-4 w-4 text-gold" />
      {average}
      <span className="font-normal text-ink/55">({count})</span>
    </span>
  )
}

export function StarsInput({ value, onChange }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <IconStar filled={n <= value} className={`h-6 w-6 ${n <= value ? 'text-gold' : 'text-line'}`} />
        </button>
      ))}
    </div>
  )
}
