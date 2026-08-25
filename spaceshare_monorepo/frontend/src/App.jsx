import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Welcome from './pages/Welcome.jsx'
import Browse from './pages/Browse.jsx'
import ListingDetail from './pages/ListingDetail.jsx'
import CreateListing from './pages/CreateListing.jsx'
import Requests from './pages/Requests.jsx'
import Bookings from './pages/Bookings.jsx'
import Profile from './pages/Profile.jsx'
import { useCurrentUser } from './lib/useCurrentUser.js'

export default function App() {
  const { user, loading, refresh, logout, tick } = useCurrentUser()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-sm text-ink/50">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <main key={tick}>
        <Routes>
          <Route
            path="/welcome"
            element={user ? <Navigate to="/" replace /> : <Welcome refresh={refresh} />}
          />
          {user ? (
            <>
              <Route path="/" element={<Browse user={user} />} />
              <Route path="/listing/:id" element={<ListingDetail user={user} refresh={refresh} />} />
              <Route path="/host" element={<CreateListing user={user} refresh={refresh} />} />
              <Route path="/requests" element={<Requests user={user} refresh={refresh} />} />
              <Route path="/bookings" element={<Bookings user={user} refresh={refresh} />} />
              <Route path="/profile" element={<Profile user={user} refresh={refresh} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/welcome" replace />} />
          )}
        </Routes>
      </main>
    </div>
  )
}
