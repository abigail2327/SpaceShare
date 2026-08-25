# SpaceShare

SpaceShare is a peer-to-peer coworking platform. Hosts offer coworking sessions in their homes, and guests request seats.

## Local setup

Requirements: Python 3.12+

This project is set up to work with `uv`, but it is not required. You can use a standard virtual environment and `pip` instead.

### Recommended setup with `uv`

```bash
uv sync
uv run python manage.py migrate
uv run python manage.py check
uv run python manage.py runserver
```

### Alternative setup with `venv` + `pip`

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install "django>=6.1" "pillow>=12.3.0" "python-dotenv>=1.2.3"
python manage.py migrate
python manage.py check
python manage.py runserver
```

The project reads `SECRET_KEY` from `.env`.

Run the test suite with:

```bash
uv run python manage.py test
```

If you are using the `venv` setup instead, run:

```bash
python manage.py test
```

## Current routes

| Route | Purpose | Authentication |
| --- | --- | --- |
| `/` | Home page | Public |
| `/register/` | Create an account | Public |
| `/login/` | Log in with email and password | Public |
| `/logout/` | Log out | Authenticated, POST |
| `/listings/` | Browse available listings | Public |
| `/listings/<id>/` | View one active listing | Public |
| `/listings/new/` | Create a listing | Authenticated |
| `/listings/mine/` | View the host's listings | Authenticated |
| `/listings/<id>/cancel/` | Cancel a listing | Owner, POST |
| `/listings/<id>/book/` | Request a seat | Authenticated |
| `/bookings/mine/` | View all guest bookings | Authenticated |
| `/bookings/requests/` | View pending host requests | Host |
| `/bookings/<id>/approve/` | Approve a request | Listing owner, POST |
| `/bookings/<id>/decline/` | Decline a request | Listing owner, POST |
| `/bookings/<id>/cancel/` | Cancel a guest booking | Booking owner, POST |

Application routes live in `spaceshare/urls.py`. The project URLconf only mounts
the app and the admin site.

## Authentication

Django session authentication is used. The custom `User` model authenticates by email rather than username. Passwords are stored using Django's password hashing.Authentication forms and state-changing forms include CSRF protection.

## Listing rules

- Each listing currently represents one dated session.
- Public discovery shows only active, future, non-full listings.
- Guests can filter discovery by area and field.
- Hosts can cancel listings, which preserves the listing and booking history.
- Cancelling a listing cancels its pending and accepted bookings.
- A listing's exact address is never shown on public pages.

## Booking rules

Booking statuses are:

```text
PENDING -> ACCEPTED
PENDING -> DECLINED
PENDING -> CANCELLED
ACCEPTED -> CANCELLED
```

Completed bookings are retained as history. Guests cannot book their own listing, create duplicate pending/accepted requests, or book a past, cancelled, inactive, or full listing. Hosts can approve only requests for their own listings. Approval checks capacity inside a database transaction.

Guests see all of their booking statuses. A future React interface can group
them as:

- Active: pending and accepted
- Past: declined, cancelled, and completed

The backend deliberately returns the complete history so the frontend can
choose how to present it.

## Address privacy

The public listing detail page exposes `general_area` only. The exact address and optional location URL are exposed in guest booking history only when that guest's booking is accepted. React must preserve this server-side rule and must not infer access from client-side state.

## React integration boundary

The current application uses standard Django views, forms, templates, and session authentication. React is not required for the current workflow.

For the MVP, React can be added progressively with CDN scripts and Babel:

1. Keep Django responsible for authentication, CSRF, validation, permissions,
	booking capacity, status transitions, and privacy.
2. Mount React inside a dedicated element such as
	`<div id="listing-filters-root"></div>`.
3. Start with a small enhancement, such as listing filters or booking display.
4. Use Django-rendered data or small `JsonResponse` endpoints when a component
	needs data.
5. Keep the Django-rendered page as a fallback while the React component is
	developed.

Do not remove Django template tags from Django-owned pages. Tags such as `{% csrf_token %}`, `{% url %}`, `{% if %}`, and `{% for %}` are part of the server-side contract. Do not duplicate booking authorization or capacity rules in React.

## Deferred features

Payments, recurring schedules, reviews, messaging, notifications, identity verification, map/geocoding, moderation, and a separate API framework are not implemented yet.
