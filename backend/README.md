# SpaceShare
Co-Working and Community

## API backend

This project now also exposes a JSON API under `/api/`, built to match the
contract in the React frontend's `docs/API_CONTRACT.md`. The original
server-rendered Django views/templates (`/`, `/listings/`, `/login/`, etc.)
still work independently and aren't required by the API.

### Local setup

```bash
python -m venv .venv
source .venv/bin/activate          # .venv\Scripts\activate on Windows
pip install -e .                   # or: pip install django pillow python-dotenv djangorestframework djangorestframework-simplejwt django-cors-headers

cp .env.example .env
# edit .env: set a real SECRET_KEY (python -c "import secrets; print(secrets.token_urlsafe(50))")

python manage.py migrate
python manage.py seed_demo         # creates 4 demo accounts + 4 listings
python manage.py runserver
```

Demo accounts (all share the password printed by `seed_demo`,
`spaceshare-demo-2026`): `amina@example.com`, `sara@example.com`,
`yusuf@example.com`, `lina@example.com`.

### Auth model

JWT (via `djangorestframework-simplejwt`), not session cookies — the
frontend is a separate-origin SPA, so this avoids CSRF token plumbing across
origins. Access tokens last 30 minutes; the frontend transparently retries
once against `/api/auth/refresh/` on a 401.

### Key design decisions (see `spaceshare/models.py` docstring for more)

- `Listing.exact_address` / `latitude` / `longitude` are stripped out of API
  responses server-side (in `ListingSerializer.to_representation`) unless
  the requester is the host or has an accepted/completed booking — this is
  enforced in code the frontend can't bypass, not just hidden in the UI.
- `Booking` status transitions (accept/decline/cancel/complete) run inside
  a `transaction.atomic()` block with `select_for_update()` on both the
  booking and the listing, so two simultaneous "Accept" clicks on the last
  seat can't both succeed.
- `User.average_rating` / `rating_count` are denormalized and recalculated
  by a `post_save` signal on `Review` — fast reads on profile/listing pages,
  small eventual-consistency window on writes.

### Deploying

Any host that runs Django works (Render, Railway, Fly.io all have a free or
cheap tier with managed Postgres). This repo is already wired for it:

- `dj-database-url` reads a `DATABASE_URL` env var and switches from SQLite
  to Postgres automatically — nothing to edit in `settings.py`. Render and
  Railway both set `DATABASE_URL` for you the moment you attach a Postgres
  database; you don't type it in yourself.
- `whitenoise` serves static files (including Django admin's CSS/JS)
  directly from the app process, so there's no separate static host to set
  up for a first deploy.
- `gunicorn` is the production WSGI server (`Procfile` and `render.yaml`
  both point to it already).

**Render (recommended — one-click):** push this repo to GitHub, then in the
Render dashboard choose New -> Blueprint and point it at the repo.
`render.yaml` provisions both the web service and a free Postgres database
in one step, and runs `migrate` automatically on every deploy. After the
first deploy, set `CORS_ALLOWED_ORIGINS` in the service's Environment tab to
your deployed frontend's actual URL (Render can't know that ahead of time).

**Railway / Fly / anywhere else (manual):**
1. Set env vars: `SECRET_KEY` (generate one, don't reuse the dev one),
   `DEBUG=False`, `ALLOWED_HOSTS` (your backend's domain, no scheme),
   `CORS_ALLOWED_ORIGINS` (your deployed frontend's URL, with scheme).
2. Attach a Postgres database — most platforms inject `DATABASE_URL`
   automatically when you do this.
3. Build command: `pip install -e . && python manage.py collectstatic --noinput && python manage.py migrate`.
   Start command: `gunicorn spaceshare_project.wsgi:application`.
4. Point the React app's `VITE_API_BASE_URL` at this backend's deployed URL.

Verified end-to-end against a real local Postgres instance before shipping
this: migrations, the full test suite, and the booking/notification/
address-gating smoke test all pass identically to SQLite.
