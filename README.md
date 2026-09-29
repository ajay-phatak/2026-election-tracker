# 2026 Midterm Elections Tracker

Live dashboard for the 2026 US midterms at **https://elections.ajaycent.com**: Senate and House battleground races, prediction-market odds, polling, and generic-ballot / control polls, with an Election Day countdown.

## What's in the UI

- **Macro**: Senate and House control odds and macro polls (`MacroMetrics`, `TrendChart`, `RangeSelector`).
- **Senate**: interactive US map (`USMap`) with watched states colored by `category`.
- **House**: curated competitive districts with Cook ratings (`HouseSection`).
- **Race drawer** (`RaceDrawer`): per-race Polymarket/Kalshi markets, polls, and GNews headlines.
- Auto-refreshes open tabs every 5 minutes (`src/lib/liveData.js`); first paint uses a single `/api/bootstrap` request.

Stack: React 18, Vite, Tailwind v4 (`@tailwindcss/vite`), react-simple-maps + us-atlas, Recharts.

## Architecture

```
Browser -> Cloudflare Pages (static dist/ + Pages Function /api/*)
              |  reads Workers KV (binding MARKET_CACHE); falls back to live providers if KV is cold/absent
              v
        KV  <-- /api/refresh  <-- cron-worker (Cloudflare Cron Triggers)
              (mirrors a clean-IP Vercel origin; news fetched direct from GNews)
```

- `src/`: the frontend. `src/config/races.config.js` is the race config source of truth.
- `functions/api/[[route]].js`: the read path. Serves aggregate routes from KV, with live-provider fallback.
- `functions/api/refresh.js`: token-gated warmer that fills KV.
- `api/*.js`: provider logic (`_providers.js`, `_polls.js`, `_news.js`) plus Vercel-style handlers. These are the live fallback, the local-dev API, and the "clean-IP origin" the warmer mirrors (default `https://2026-election-tracker.vercel.app`).
- `cron-worker/`: separate Worker that only fires cron triggers.
- `docs/kv-warmer-plan.md`: design rationale for the KV warmer.

### Data sources

| Data | Source |
| --- | --- |
| Race and control markets | Polymarket, Kalshi |
| Macro polls | `polling.votehub.com` |
| Senate polls | legacy `api.votehub.com` |
| Race headlines | GNews (needs `NEWS_API_KEY`) |
| House ratings | Cook Political Report, hand-entered in `races.config.js` |

## Local development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/
npm run lint
npm run preview
```

`vite dev` serves `api/*.js` through a small middleware (`vite.config.js`), so there is no KV locally and everything is fetched live. Set `NEWS_API_KEY` in your environment to get headlines; without it news degrades gracefully.

## Deploy

Deployed to **Cloudflare Pages** via git integration (build `npm run build`, output `dist`). `/api` is a Pages Function from `functions/`. There is intentionally **no `wrangler.toml` at the repo root**: it would make Cloudflare treat the project as a Worker and break the Pages build. `public/_redirects` provides the SPA fallback.

Pages settings (dashboard, names only):

- KV namespace binding: `MARKET_CACHE`
- Secrets/env: `REFRESH_TOKEN`, `NEWS_API_KEY`
- Optional: `WARM_ORIGIN` (override the Vercel origin the warmer mirrors)

## Data refresh

- `cron-worker/` (`election-tracker-cron`) calls `/api/refresh` on Cloudflare Cron Triggers: `?only=markets` every 15 min (`*/15 * * * *`), `?only=news` every 4 h (`7 */4 * * *`). Vars: `TARGET_URL` in `wrangler.toml`; secret `REFRESH_TOKEN` (same value as Pages). Deploy by hand from that folder: `npx wrangler deploy`, then `npx wrangler secret put REFRESH_TOKEN`. Watch with `npx wrangler tail election-tracker-cron`.
- `/api/refresh` requires the token (`X-Refresh-Token` header or `?token=`). Groups: `all|markets|core|races|histories|news`.
- Markets are mirrored from the Vercel origin (one subrequest per key) because direct fetches from Cloudflare's shared egress blow the free 50-subrequest cap. `refresh.js` has a budget guard that counts fetches and KV ops against that cap.
- News is fetched directly from GNews on the slower cadence to stay under its ~100 requests/day quota. Recheck the cadence if Senate states are added.
- The warm also composes a `bootstrap` KV key so first paint is one request.
- `.github/workflows/refresh.yml` is **manual only** (`gh workflow run refresh.yml -f only=markets`), e.g. right after a deploy. Needs repo secret `REFRESH_TOKEN`, optional variable `PAGES_URL`. Don't re-add a schedule: GitHub throttled it, and running both would exceed the free KV write quota (1,000/day).

## Config and upkeep

- **Senate**: edit `WATCHED_RACES.senate` in `src/config/races.config.js`. Reclassifying a race is one `category` field change (client-only, no KV warm needed). Check the map fill counts afterward.
- **House**: edit `WATCHED_RACES.house`; `rating` is Cook's.
- Adding states raises GNews and KV usage; see the cadence notes above.
