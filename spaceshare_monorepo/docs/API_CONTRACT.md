# SpaceShare API contract (v1)

This is the contract the React app now codes against (`src/lib/`), and the
contract the Django backend must implement. Keeping this file in sync with
both sides is the whole point — if a field or endpoint changes on one side,
update this file in the same commit.

Base URL comes from `VITE_API_BASE_URL` (e.g. `http://localhost:8000`).
Every path below is relative to that.

Wire format is **snake_case JSON** (Django/DRF's natural output). The React
`store.js` layer converts snake_case <-> camelCase at the boundary, so
components keep using `hostId`, `seatsTotal`, etc. — only `store.js` and
`api/*.js` know the wire format exists.

## Auth

Token-based (JWT). Access token is short-lived and sent as
`Authorization: Bearer <token>`; refresh token is used to silently get a
new access token on 401.

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/api/auth/register/` | – | `{ email, password, first_name, last_name, bio, linkedin_url, area, field_tag }` | `{ access, refresh, user }` |
| POST | `/api/auth/login/` | – | `{ email, password }` | `{ access, refresh, user }` |
| POST | `/api/auth/refresh/` | – | `{ refresh }` | `{ access }` |
| GET | `/api/auth/me/` | required | – | `user` |
| PATCH | `/api/auth/me/` | required | partial `user` fields | `user` |

`user` shape:
```json
{
  "id": 1,
  "email": "amina@example.com",
  "first_name": "Amina",
  "last_name": "K.",
  "bio": "...",
  "linkedin_url": "linkedin.com/in/amina-k",
  "area": "JBR, Dubai",
  "field_tag": "tech",
  "email_verified": true,
  "average_rating": 4.8,
  "rating_count": 6
}
```

## Listings

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/listings/` | – | query params: `area`, `field_tag`, `date`, `price` (`free`/`paid`), `women_only` (`true`), `host` (user id — used for "my listings") |
| POST | `/api/listings/` | required | host = current user |
| GET | `/api/listings/:id/` | – | `exact_address`/`latitude`/`longitude` only present if requester is the host or has an accepted booking |
| PATCH | `/api/listings/:id/` | required, host only | e.g. `{ "status": "cancelled" }` |

`listing` shape (fields present depend on auth, see above):

`field_tag` choices: `tech`, `design`, `marketing`, `finance`, `writing`, `mixed`.

```json
{
  "id": 12,
  "host": { "id": 1, "name": "Amina K.", "average_rating": 4.8, "rating_count": 6 },
  "title": "Quiet tech-friendly workspace in JBR",
  "general_area": "JBR, Dubai",
  "exact_address": "Rimal 4, Apt 1203, JBR",
  "latitude": 25.0805,
  "longitude": 55.1339,
  "date": "2026-08-27",
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "seats_total": 3,
  "seats_available": 2,
  "field_tag": "tech",
  "women_only": false,
  "is_free": true,
  "price": null,
  "wifi_available": true,
  "kid_friendly": false,
  "pet_friendly": true,
  "lunch_included": false,
  "parking_available": false,
  "quiet_room": true,
  "prayer_room": false,
  "house_rules": "...",
  "status": "active",
  "cover_image": "https://images.unsplash.com/..."
}
```

## Bookings

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/listings/:id/bookings/` | required | `{ "message": "..." }` — creates a `request_received` notification for the host |
| GET | `/api/bookings/mine/` | required | bookings where `guest = me` |
| GET | `/api/bookings/requests/` | required | bookings where `listing.host = me` |
| PATCH | `/api/bookings/:id/` | required | `{ "status": "accepted" \| "declined" \| "cancelled" \| "completed" }` — accept/decline creates a notification for the guest |

`booking` shape:
```json
{
  "id": "b3f1...uuid",
  "listing": { "id": 12, "title": "...", "date": "2026-08-27", "host": { "id": 1, "name": "Amina K." } },
  "guest": { "id": 4, "name": "Lina P.", "average_rating": null, "rating_count": 0 },
  "message": "Hi! I'm a backend engineer...",
  "status": "pending",
  "booked_at": "2026-08-25T09:00:00Z",
  "responded_at": null
}
```

## Reviews

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/bookings/:id/reviews/` | required | `{ "rating": 5, "comment": "...", "direction": "host_to_guest" \| "guest_to_host" }` |
| GET | `/api/bookings/:id/reviews/` | required | reviews already left on this booking (0–2 — one per direction), used to hide the "Rate" button once submitted |

## Notifications

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/notifications/` | required | most recent first |
| GET | `/api/notifications/unread-count/` | required | `{ "count": 2 }` |
| POST | `/api/notifications/:id/read/` | required | marks one as read |
| POST | `/api/notifications/mark-all-read/` | required | marks all as read for current user |

`notification` shape:
```json
{
  "id": 9,
  "type": "request_received" | "request_accepted" | "request_declined",
  "booking_id": "b3f1...uuid",
  "listing_id": 12,
  "read": false,
  "created_at": "2026-08-25T09:00:00Z"
}
```

## Error shape

Any non-2xx response body: `{ "detail": "Human-readable message." }`.
`store.js` reads `.detail` and throws it as an `Error` message, same as the
old localStorage version did — no component-level error handling changes.
