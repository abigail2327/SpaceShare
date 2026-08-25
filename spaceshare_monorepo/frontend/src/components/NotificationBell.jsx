import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../lib/store.js'
import { timeAgo } from '../lib/format.js'
import { IconBell, IconCheck, IconX } from './Icons.jsx'

const COPY = {
  request_received: 'New request for your listing',
  request_accepted: 'Your request was accepted',
  request_declined: 'Your request was declined',
}

const DOT_TONE = {
  request_received: 'bg-gold',
  request_accepted: 'bg-forest',
  request_declined: 'bg-clay',
}

const POLL_MS = 30000

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    function pollUnread() {
      getUnreadNotificationCount()
        .then((count) => {
          if (!cancelled) setUnread(count)
        })
        .catch(() => {})
    }
    pollUnread()
    const interval = setInterval(pollUnread, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    getNotifications()
      .then(setNotifications)
      .catch(() => setNotifications([]))
  }, [open])

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function openItem(n) {
    setOpen(false)
    try {
      await markNotificationRead(n.id)
    } catch {
      // non-fatal — navigation still proceeds
    }
    setUnread((u) => Math.max(u - 1, 0))
    if (n.type === 'request_received') {
      navigate('/requests')
    } else {
      navigate(`/listing/${n.listingId}`)
    }
  }

  async function markAll() {
    try {
      await markAllNotificationsRead()
      setNotifications((list) => list.map((n) => ({ ...n, read: true })))
      setUnread(0)
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink/70 hover:border-ink/25"
        aria-label="Notifications"
      >
        <IconBell className="h-4.5 w-4.5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-clay px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAll} className="text-xs font-medium text-clay hover:underline">
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-ink/40 hover:text-ink">
                <IconX className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink/45">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-paper ${
                    n.read ? '' : 'bg-goldlight/30'
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.read ? 'bg-line' : DOT_TONE[n.type] || 'bg-gold'
                    }`}
                  />
                  <span className="flex-1">
                    <span className="block text-sm text-ink/85">{COPY[n.type] || 'Update on your activity'}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-ink/45">
                      {n.type === 'request_accepted' && <IconCheck className="h-3 w-3" />}
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
