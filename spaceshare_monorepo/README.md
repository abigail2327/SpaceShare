# SpaceShare

Co-working, from someone's living room. A React SPA (`frontend/`) talking to
a Django REST API (`backend/`), joined by the contract in
`docs/API_CONTRACT.md` — read that file first if you're changing how the two
sides talk to each other.

```
spaceshare/
├── docs/
│   └── API_CONTRACT.md   # the contract both sides are built against
├── frontend/             # React + Vite + Tailwind SPA
└── backend/              # Django + DRF API (JWT auth, Postgres in prod)
```

## Running it locally

Two terminals, backend first:

```bash
# terminal 1 — backend, http://localhost:8000
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e .
cp .env.example .env   # edit SECRET_KEY
python manage.py migrate
python manage.py seed_demo     # demo accounts, password printed at the end
python manage.py runserver
```

```bash
# terminal 2 — frontend, http://localhost:5173
cd frontend
npm install
cp .env.example .env   # VITE_API_BASE_URL=http://localhost:8000 by default
npm run dev
```

Open `http://localhost:5173` and sign in with one of the seeded demo
accounts (see `backend/README.md` for the list + password).

## Deploying

The two halves deploy to two different kinds of host and don't need to live
on the same server:

- **`frontend/`** → any static host (Vercel, Netlify). Set `VITE_API_BASE_URL`
  to the backend's deployed URL.
- **`backend/`** → any host that runs Django (Render has a one-click
  `render.yaml` blueprint already in `backend/`; Railway/Fly work too).
  Set `CORS_ALLOWED_ORIGINS` to the frontend's deployed URL.

Full details, env vars, and commands are in each folder's own README —
`frontend/README.md` and `backend/README.md`.
