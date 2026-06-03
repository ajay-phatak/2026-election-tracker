# 2026 Senate War Room

A polished, dark-themed dashboard tracking the 2026 US Senate midterm battleground races —
betting markets, polling averages, and Trump approval at a glance.

> **Status:** Pre-API build. **All data is mocked.** The mocks are shaped exactly like the
> real APIs will return, so swapping them for live calls is a drop-in change in a later session.

## Stack

- **React + Vite**
- **Tailwind CSS v4** (`@tailwindcss/vite`, CSS-first config in `src/index.css`)
- **react-simple-maps** + `us-atlas` TopoJSON — the interactive US map
- **Recharts** — polling trend chart
- Deployed to **Vercel** (`vercel.json` included)

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
npm run preview  # preview the production build
```

## Structure

```
src/
  config/races.config.js   # WATCHED_RACES + CATEGORIES — single source of truth (colors, incumbents)
  lib/                     # race lookups + formatting helpers
  mocks/                   # API-shaped mock data; each file notes the API it will replace
    macroMetrics.js        #   -> Kalshi/Polymarket control markets + approval aggregator
    polling.js             #   -> polling-average API (FL/AK left empty to show the empty state)
    bettingOdds.js         #   -> Kalshi + Polymarket per-race markets
  components/
    MacroMetrics.jsx       # Senate / House control + Trump approval cards
    USMap.jsx              # centerpiece map: watched states colored by category, legend, click
    RaceDrawer.jsx         # right-side detail panel: polls, odds, notes, empty states
  App.jsx                  # layout + selected-state wiring
```

## Swapping in real APIs (later)

Each file in `src/mocks/` exports the exact object shape the UI consumes. Replace the static
exports with `fetch`/SDK calls that resolve to the same shape — no component changes needed.
The `kalshiMarketId` / `polymarketSlug` fields in `races.config.js` are placeholders for wiring
per-race market lookups.
