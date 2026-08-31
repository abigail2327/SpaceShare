# SpaceShare

**Spaces to share. Places to work. People to meet.**

SpaceShare is a peer-to-peer marketplace for co-working sessions in real homes. Remote and hybrid workers can host a session in their own space or join one happening nearby, trading empty apartments and coworking memberships for company, flexibility, and a change of scene.

Built and publicly launched through the DoraHacks 2.0 product residency by DoraDAO.

[Live App](https://spaceshare-vert.vercel.app/welcome) &nbsp;·&nbsp; [Product Hunt](https://www.producthunt.com/products/spaceshare?launch=spaceshare) &nbsp;·&nbsp; [Demo Video](https://www.linkedin.com/feed/update/urn:li:ugcPost:7499204012651544576/)

![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Django](https://img.shields.io/badge/Django-092E20?logo=django&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?logo=render&logoColor=white)

---

## Screenshots

![SpaceShare landing page](docs/landing.png)

![Host a session](docs/host-session.png)

---

## The Problem

Remote work gave people flexibility, but it also left many of them working alone in empty apartments, with Slack messages standing in for human company. Dedicated coworking spaces solve the isolation but add a membership cost and a commute. SpaceShare sits in between: skip the membership and the coffee-shop markup, and work from someone's living room instead of your desk.

## Features

- Full host and guest booking flow with session requests, approvals, and notifications
- Trust and safety by design: verified hosts, gradual address reveal (exact location shared only after a request is accepted), and women-only space options
- Location-aware discovery of sessions happening nearby
- Session listings with cover photos, titles, and details
- Reviews and ratings for both hosts and guests

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite |
| Backend | Django, Django REST Framework |
| Database | PostgreSQL |
| Hosting | Vercel (frontend), Render (backend) |

## Architecture

A single monorepo houses the React/Vite client and the Django REST backend. The frontend is deployed to Vercel and talks to the Django API on Render, backed by a PostgreSQL database in production.

```
SpaceShare/
├── frontend/     React + Vite client
├── backend/      Django REST API
└── docs/         Screenshots and assets
```

> Adjust the tree above to match your actual folder names.

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Copy `.env.example` to `.env` in each directory and fill in your own values. Never commit real credentials.

## Links

- Live app: https://spaceshare-vert.vercel.app/welcome
- Product Hunt: https://www.producthunt.com/products/spaceshare?launch=spaceshare
- Demo video: https://www.linkedin.com/feed/update/urn:li:ugcPost:7499204012651544576/

## Contributors

Built by the SpaceShare team during the DoraHacks 2.0 residency.

- Abigail Da Costa — [GitHub](https://github.com/abigail2327)
- Zainab Shah -[GitHub](https://github.com/Tarctic)

## Acknowledgments

Developed during DoraHacks 2.0, a two-week product residency by DoraDAO focused on taking products from idea to public launch, with mentorship from industry experts across product, engineering, growth, and marketing.
