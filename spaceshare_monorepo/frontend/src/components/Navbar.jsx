import { NavLink } from 'react-router-dom'
import Avatar from './Avatar.jsx'
import NotificationBell from './NotificationBell.jsx'
import { IconChevronRight } from './Icons.jsx'

const NAV_ITEMS = [
  { to: '/', label: 'Browse', end: true },
  { to: '/host', label: 'Host a session' },
  { to: '/requests', label: 'Requests' },
  { to: '/bookings', label: 'My bookings' },
]

function Logo() {
  return (
    <NavLink to="/" className="flex shrink-0 items-center gap-2">
      <svg viewBox="0 0 32 32" className="h-8 w-8 text-gold">
        <rect x="1" y="1" width="30" height="30" rx="9" fill="currentColor" opacity="0.14" />
        <path
          d="M16 6.5 22 11v10L16 25.5 10 21V11L16 6.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="16" r="2.1" fill="currentColor" />
      </svg>
      <span className="font-display text-lg font-medium italic tracking-tight text-ink">SpaceShare</span>
    </NavLink>
  )
}

function DesktopLink({ to, label, end }) {
  return (
    <NavLink to={to} end={end} className="group relative px-1 py-2 text-sm font-medium">
      {({ isActive }) => (
        <>
          <span className={isActive ? 'text-ink' : 'text-ink/55 transition-colors group-hover:text-ink'}>
            {label}
          </span>
          <span
            className={`absolute -bottom-[1px] left-0 right-0 h-[2px] rounded-full bg-gold transition-opacity ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </>
      )}
    </NavLink>
  )
}

export default function Navbar({ user, onLogout }) {
  return (
    <header className="sticky top-0 z-30 glass border-b border-line">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
        <Logo />

        {user && (
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_ITEMS.map((item) => (
              <DesktopLink key={item.to} {...item} />
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <NotificationBell />
              <NavLink
                to="/profile"
                className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 text-sm font-medium text-ink hover:border-ink/25"
              >
                <Avatar name={user.name} size={28} />
                <span className="hidden sm:inline">{user.name.split(' ')[0]}</span>
              </NavLink>
              <button
                onClick={onLogout}
                className="hidden rounded-full px-3 py-1.5 text-sm text-ink/45 hover:text-ink md:block"
              >
                Sign out
              </button>
            </>
          ) : (
            <NavLink
              to="/welcome#sign-up"
              className="inline-flex items-center gap-1 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink shadow-soft hover:bg-gold/90"
            >
              Get started
              <IconChevronRight className="h-4 w-4" />
            </NavLink>
          )}
        </div>
      </div>

      {user && (
        <nav className="flex items-center gap-4 overflow-x-auto px-4 pb-3 scroll-hide md:hidden">
          {NAV_ITEMS.map((item) => (
            <DesktopLink key={item.to} {...item} />
          ))}
          <button onClick={onLogout} className="ml-auto shrink-0 text-xs font-medium text-ink/45">
            Sign out
          </button>
        </nav>
      )}
    </header>
  )
}
