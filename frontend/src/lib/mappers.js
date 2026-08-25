const AMENITY_KEYS = {
  wifi: 'wifiAvailable',
  petFriendly: 'petFriendly',
  kidFriendly: 'kidFriendly',
  lunch: 'lunchIncluded',
  parking: 'parkingAvailable',
  quiet: 'quietRoom',
  prayerRoom: 'prayerRoom',
}

function trimSeconds(t) {
  return typeof t === 'string' ? t.slice(0, 5) : t
}

export function mapHost(u) {
  if (!u) return null
  return {
    id: u.id,
    name: u.name,
    averageRating: u.averageRating ?? null,
    ratingCount: u.ratingCount ?? 0,
  }
}

export function mapUserFromApi(u) {
  if (!u) return null
  return {
    id: u.id,
    name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
    bio: u.bio || '',
    email: u.email,
    emailVerified: Boolean(u.emailVerified),
    linkedin: u.linkedinUrl || '',
    area: u.area || '',
    averageRating: u.averageRating ?? null,
    ratingCount: u.ratingCount ?? 0,
  }
}

export function mapUserToApi(patch) {
  const out = {}
  if (patch.name !== undefined) {
    const [first, ...rest] = patch.name.trim().split(/\s+/)
    out.firstName = first || ''
    out.lastName = rest.join(' ')
  }
  if (patch.bio !== undefined) out.bio = patch.bio
  if (patch.linkedin !== undefined) out.linkedinUrl = patch.linkedin
  if (patch.area !== undefined) out.area = patch.area
  return out
}

export function mapListingFromApi(l) {
  const amenities = Object.entries(AMENITY_KEYS)
    .filter(([, apiKey]) => l[apiKey])
    .map(([appKey]) => appKey)

  return {
    id: l.id,
    hostId: l.host?.id,
    host: mapHost(l.host),
    title: l.title,
    area: l.generalArea,
    address: l.exactAddress, // absent unless the API authorized this requester
    lat: l.latitude,
    lng: l.longitude,
    date: l.date,
    startTime: trimSeconds(l.startTime),
    endTime: trimSeconds(l.endTime),
    seatsTotal: l.seatsTotal,
    seatsAvailable: l.seatsAvailable,
    field: l.fieldTag,
    womenOnly: Boolean(l.womenOnly),
    price: l.isFree ? 0 : Number(l.price),
    amenities,
    houseRules: l.houseRules || '',
    image: l.coverImage,
    status: l.status,
  }
}

export function mapListingToApi(form) {
  const has = (key) => (form.amenities || []).includes(key)
  return {
    title: form.title,
    generalArea: form.area,
    exactAddress: form.address,
    latitude: form.lat,
    longitude: form.lng,
    date: form.date,
    startTime: form.startTime,
    endTime: form.endTime,
    seatsTotal: Number(form.seatsTotal),
    fieldTag: form.field,
    womenOnly: Boolean(form.womenOnly),
    isFree: Number(form.price) === 0,
    price: Number(form.price) === 0 ? null : Number(form.price),
    wifiAvailable: has('wifi'),
    petFriendly: has('petFriendly'),
    kidFriendly: has('kidFriendly'),
    lunchIncluded: has('lunch'),
    parkingAvailable: has('parking'),
    quietRoom: has('quiet'),
    prayerRoom: has('prayerRoom'),
    houseRules: form.houseRules || '',
    coverImage: form.image,
  }
}

export function mapBookingFromApi(b) {
  return {
    id: b.id,
    listingId: b.listing?.id,
    listingTitle: b.listing?.title,
    listingDate: b.listing?.date,
    hostId: b.listing?.host?.id,
    hostName: b.listing?.host?.name,
    guestId: b.guest?.id,
    guest: mapHost(b.guest),
    message: b.message || '',
    status: b.status,
    bookedAt: b.bookedAt,
    respondedAt: b.respondedAt,
  }
}

export function mapNotificationFromApi(n) {
  return {
    id: n.id,
    type: n.type,
    bookingId: n.bookingId,
    listingId: n.listingId,
    read: Boolean(n.read),
    createdAt: n.createdAt,
  }
}

export function mapReviewFromApi(r) {
  return {
    id: r.id,
    bookingId: r.booking,
    reviewerId: r.reviewer,
    revieweeId: r.reviewee,
    rating: r.rating,
    comment: r.comment || '',
    direction: r.direction,
    createdAt: r.createdAt,
  }
}
