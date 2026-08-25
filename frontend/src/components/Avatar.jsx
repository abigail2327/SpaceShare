const PALETTE = ['#C69A3E', '#3F4B3B', '#A9552E', '#1C1A17', '#7A6A50']

function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997
  return h
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] || ''
  const second = parts[1]?.[0] || ''
  return (first + second).toUpperCase() || '?'
}

export default function Avatar({ name = '', size = 40, className = '', ring = false }) {
  const bg = PALETTE[hashStr(name || '?') % PALETTE.length]
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-display font-medium text-white ${
        ring ? 'ring-2 ring-white' : ''
      } ${className}`}
      style={{ width: size, height: size, backgroundColor: bg, fontSize: Math.round(size * 0.38) }}
    >
      {initials(name)}
    </span>
  )
}
