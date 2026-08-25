// ---------------------------------------------------------------------------
// SpaceShare API client.
//
// This module is a drop-in replacement for the old localStorage-backed
// store.js — same exported function names, same argument shapes wherever
// possible, so pages needed only their data-fetching (sync -> async), not
// their business logic, rewritten. See docs/API_CONTRACT.md for the wire
// format this talks to.
// ---------------------------------------------------------------------------

import { request } from './apiClient.js'
import {
  mapListingFromApi,
  mapListingToApi,
  mapBookingFromApi,
  mapNotificationFromApi,
  mapReviewFromApi,
} from './mappers.js'

const AMENITY_LABELS = {
  wifi: 'Fast wifi',
  kidFriendly: 'Kid-friendly',
  petFriendly: 'Pet-friendly',
  lunch: 'Lunch included',
  parking: 'Parking',
  quiet: 'Quiet room',
  prayerRoom: 'Prayer room',
}

const FIELD_LABELS = {
  tech: 'Tech',
  design: 'Design',
  marketing: 'Marketing',
  finance: 'Finance',
  writing: 'Writing',
  mixed: 'Mixed / general',
}

// Curated, freely-licensed workspace photography (Unsplash), offered as a
// cover-photo picker in the host-listing form. The chosen URL is sent to
// the API as `coverImage` — no file upload required for the MVP.
const COVER_OPTIONS = [
  { id: 'minimal-desk', label: 'Minimal desk', url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80' },
  { id: 'bright-studio', label: 'Bright studio', url: 'https://images.unsplash.com/photo-1558478551-1a378f63328e?auto=format&fit=crop&w=1200&q=80' },
  { id: 'executive-desk', label: 'Executive desk', url: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1200&q=80' },
  { id: 'collaborative-table', label: 'Collaborative table', url: 'https://images.unsplash.com/photo-1531973576160-7125cd663d86?auto=format&fit=crop&w=1200&q=80' },
  { id: 'dining-nook', label: 'Home dining nook', url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80' },
  { id: 'creative-corner', label: 'Creative corner', url: 'https://images.unsplash.com/photo-1519086588705-c935fdedcc14?auto=format&fit=crop&w=1200&q=80' },
  { id: 'wooden-setup', label: 'Wooden desk setup', url: 'https://images.unsplash.com/photo-1678733405763-ecaf19dbccbe?auto=format&fit=crop&w=1200&q=80' },
  { id: 'imac-workstation', label: 'iMac workstation', url: 'https://images.unsplash.com/photo-1502810190503-8303352d0dd1?auto=format&fit=crop&w=1200&q=80' },
]
const DEFAULT_COVER = COVER_OPTIONS[0].url

// ---- listings ---------------------------------------------------------

export async function getListings(filters = {}) {
  const params = new URLSearchParams()
  if (filters.area) params.set('area', filters.area)
  if (filters.field && filters.field !== 'any') params.set('field_tag', filters.field)
  if (filters.date) params.set('date', filters.date)
  if (filters.price && filters.price !== 'any') params.set('price', filters.price)
  if (filters.womenOnly) params.set('women_only', 'true')
  if (filters.hostId) params.set('host', filters.hostId)
  const qs = params.toString()
  const data = await request(`/api/listings/${qs ? `?${qs}` : ''}`, { auth: false })
  return data.map(mapListingFromApi)
}

export async function getListing(id) {
  const data = await request(`/api/listings/${id}/`, { auth: false })
  return mapListingFromApi(data)
}

export async function getListingsByHost(hostId) {
  return getListings({ hostId })
}

export async function createListing(form) {
  const data = await request('/api/listings/', { method: 'POST', body: mapListingToApi(form) })
  return mapListingFromApi(data)
}

export async function updateListingStatus(id, status) {
  const data = await request(`/api/listings/${id}/`, { method: 'PATCH', body: { status } })
  return mapListingFromApi(data)
}

// ---- bookings -----------------------------------------------------------

export async function getBookingsForGuest() {
  const data = await request('/api/bookings/mine/')
  return data.map(mapBookingFromApi)
}

export async function getBookingsForHost() {
  const data = await request('/api/bookings/requests/')
  return data.map(mapBookingFromApi)
}

export async function requestBooking({ listingId, message }) {
  try {
    const data = await request(`/api/listings/${listingId}/bookings/`, {
      method: 'POST',
      body: { message },
    })
    return mapBookingFromApi(data)
  } catch (err) {
    // Preserve the old "You already have a request for this listing"-style
    // message so ListingDetail's error display doesn't need changes.
    throw new Error(err.message)
  }
}

export async function updateBookingStatus(bookingId, status) {
  const data = await request(`/api/bookings/${bookingId}/`, { method: 'PATCH', body: { status } })
  return mapBookingFromApi(data)
}

// ---- reviews --------------------------------------------------------------

export async function getReviewsForBooking(bookingId) {
  const data = await request(`/api/bookings/${bookingId}/reviews/`)
  return data.map(mapReviewFromApi)
}

export async function submitReview({ bookingId, rating, comment, direction }) {
  const data = await request(`/api/bookings/${bookingId}/reviews/`, {
    method: 'POST',
    body: { rating, comment, direction },
  })
  return mapReviewFromApi(data)
}

// ---- notifications ------------------------------------------------------

export async function getNotifications() {
  const data = await request('/api/notifications/')
  return data.map(mapNotificationFromApi)
}

export async function getUnreadNotificationCount() {
  const data = await request('/api/notifications/unread-count/')
  return data.count
}

export async function markNotificationRead(id) {
  await request(`/api/notifications/${id}/read/`, { method: 'POST' })
}

export async function markAllNotificationsRead() {
  await request('/api/notifications/mark-all-read/', { method: 'POST' })
}

export { AMENITY_LABELS, FIELD_LABELS, COVER_OPTIONS, DEFAULT_COVER }
