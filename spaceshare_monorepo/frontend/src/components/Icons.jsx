// A small, consistent stroke-icon set. Kept dependency-free (plain inline
// SVG) so the app doesn't need an icon package — every icon shares the same
// stroke weight and viewBox for visual consistency.

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function IconWifi(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2 8.5c5.5-5 14.5-5 20 0" />
      <path d="M5.5 12.5c3.7-3.3 9.3-3.3 13 0" />
      <path d="M9 16.3c1.9-1.7 4.1-1.7 6 0" />
      <circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconPaw(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="7" cy="9" r="1.6" />
      <circle cx="12" cy="6.5" r="1.6" />
      <circle cx="17" cy="9" r="1.6" />
      <path d="M8 14.5c0-2 1.8-3 4-3s4 1 4 3-2.2 4.5-4 4.5-4-2.5-4-4.5Z" />
    </svg>
  )
}

export function IconChild(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="6" r="2.2" />
      <path d="M7 20v-5.5a5 5 0 0 1 10 0V20" />
      <path d="M9 14.5v5.5M15 14.5v5.5" />
    </svg>
  )
}

export function IconUtensils(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3v7a2 2 0 0 0 4 0V3M8 10v11" />
      <path d="M16 3c-1.4 0-2.5 1.8-2.5 5s1.1 4 2.5 4 2.5-.7 2.5-4-1.1-5-2.5-5Z" />
      <path d="M16 12v9" />
    </svg>
  )
}

export function IconParking(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="3.5" width="16" height="17" rx="3" />
      <path d="M10 16V8h3a2.6 2.6 0 0 1 0 5.2h-3" />
    </svg>
  )
}

export function IconMoon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </svg>
  )
}

export function IconCompass(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m14.8 9.2-1.8 4.8-4.8 1.8 1.8-4.8 4.8-1.8Z" />
    </svg>
  )
}

export function IconStar({ filled, ...props }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.4}
      strokeLinejoin="round"
      {...props}
    >
      <path d="M10 1.6l2.6 5.4 5.9.7-4.3 4.1 1.1 5.9L10 14.9l-5.3 2.7 1.1-5.9-4.3-4.1 5.9-.7L10 1.6Z" />
    </svg>
  )
}

export function IconMapPin(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21s-6.5-5.9-6.5-11a6.5 6.5 0 1 1 13 0c0 5.1-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  )
}

export function IconCalendar(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </svg>
  )
}

export function IconClock(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  )
}

export function IconUsers(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 8.2a3 3 0 1 1 3.2 3M15.5 14.2c2.9.5 5 2.6 5 5.8" />
    </svg>
  )
}

export function IconCheck(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12.5 9.5 17 19 7" />
    </svg>
  )
}

export function IconLock(props) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.3" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  )
}

export function IconChevronRight(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

export function IconSearch(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function IconNavigation(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 11.5 20 4l-7.5 17-2-7.5-7.5-2Z" />
    </svg>
  )
}

export function IconShield(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 5 6v6c0 4.6 3 7.7 7 8.5 4-.8 7-3.9 7-8.5V6l-7-2.5Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </svg>
  )
}

export function IconArrowRight(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  )
}

export function IconBell(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 10.5a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
      <path d="M10 19.5a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function IconX(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}
