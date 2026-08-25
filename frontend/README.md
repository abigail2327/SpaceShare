# SpaceShare v2 — corkboard redesign

Same idea, same underlying logic as the first prototype (mock backend,
booking/review flow) — completely reworked UI/UX: a corkboard where listings
are literally pinned index cards, and forms live on lined notebook paper as a
nod to the original hand-drawn wireframes.

## What changed from v1
- New visual language: warm cork/paper/ink palette instead of the clean
  dashboard-card look, index-card listings with a pin and slight tilt,
  wood-strip navbar, hand-lettered (Caveat) section labels.
- Same data model, same mock backend (`src/lib/store.js`), same booking →
  accept → address-reveal → complete → review flow. If you liked how v1
  behaved, this behaves identically — only the look changed.

## Run it

```bash
npm install
npm run dev
```

Open the printed `http://localhost:5173` URL.

**Do not run `npm audit fix --force` in this project.** It will upgrade
`vite` past what `@vitejs/plugin-react` supports and break the dev server
(exactly what happened in v1). If `npm install` ever complains about
vulnerabilities, ignore it for a prototype — it's about outdated *tooling*
versions, not this app's code.

## Try it
Same as before: use the "jump in as" chips on the welcome screen, or sign up
fresh. Switch users via the dropdown in the navbar to test both host and
guest sides of a booking.
