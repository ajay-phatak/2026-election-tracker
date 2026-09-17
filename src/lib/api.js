// Client-side helpers that hit our serverless proxy (/api/*), which normalizes
// Kalshi + Polymarket into { sources: [{ id, label, demYes, repYes, lastUpdated }] }.
//
// Everything the first paint needs comes from ONE /api/bootstrap request
// ({ control, polls, racePolls, houseRaces, races }); each fetcher below reads
// its piece out of that shared payload and only falls back to its individual
// endpoint when the piece is missing (bootstrap cold/unavailable). That keeps a
// fresh visit to ~1 API request instead of ~13 — which is what the free-tier
// Cloudflare quotas are budgeted around. History and news stay lazy per drawer.
//
// Per-state requests are memoized for the session (only 9 states). Reload to refresh.

async function getJson(url, label) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${label} ${r.status}`);
  return r.json();
}

// Memoize a promise per key; drop it on failure so a later call can retry.
function memoize(map, key, make) {
  if (!map.has(key)) {
    map.set(
      key,
      make().catch((e) => {
        map.delete(key);
        throw e;
      })
    );
  }
  return map.get(key);
}

// The shared first-paint payload. Resolves to null on any failure (404 on an old
// deploy, 503 cold KV, network) so callers just fall back to their own endpoint;
// not memoized via memoize() because null is a valid "don't retry per caller"
// result — retrying bootstrap 13 times would defeat its purpose.
let bootstrapPromise = null;
function fetchBootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = getJson("/api/bootstrap", "bootstrap").catch(() => null);
  }
  return bootstrapPromise;
}

// Serve a piece from the bootstrap payload, else from its individual endpoint.
async function fromBootstrap(pick, live) {
  const boot = await fetchBootstrap();
  const v = boot ? pick(boot) : undefined;
  return v != null ? v : live();
}

export function fetchControl() {
  return fromBootstrap(
    (b) => b.control,
    () => getJson("/api/control", "control")
  );
}

// Macro polling averages + trend: { genericBallot:{dem,rep,n,lastUpdated,trend}, approval:{...} }
export function fetchPolls() {
  return fromBootstrap(
    (b) => b.polls,
    () => getJson("/api/polls", "polls")
  );
}

// Win-probability history for the control markets: { senate:{sources}, house:{sources} }
// Memoized per range (default "all") so switching ranges back and forth in the
// same session doesn't re-fetch — mirrors fetchRaceHistory below.
const controlHistoryCache = new Map();
export function fetchControlHistory(range = "all") {
  return memoize(controlHistoryCache, range, () =>
    getJson(`/api/control-history?range=${encodeURIComponent(range)}`, "control-history")
  );
}

const oddsCache = new Map();
export function fetchRaceOdds(stateCode) {
  return memoize(oddsCache, stateCode, () =>
    fromBootstrap(
      (b) => b.races?.[stateCode],
      () => getJson(`/api/race?state=${encodeURIComponent(stateCode)}`, "race")
    )
  );
}

// Historical win-probability time-series per provider: { sources: [{ id, label, points:[{t,dem,rep}], hasData }] }
// Keyed by stateCode + range so each window is cached independently per race.
const historyCache = new Map();
export function fetchRaceHistory(stateCode, range = "all") {
  return memoize(historyCache, `${stateCode}:${range}`, () =>
    getJson(
      `/api/history?state=${encodeURIComponent(stateCode)}&range=${encodeURIComponent(range)}`,
      "history"
    )
  );
}

// Recent news headlines per state: { stateCode, articles:[{title,link,source,publishedAt}], lastUpdated }
const newsCache = new Map();
export function fetchRaceNews(stateCode) {
  return memoize(newsCache, stateCode, () =>
    getJson(`/api/race-news?state=${encodeURIComponent(stateCode)}`, "race-news")
  );
}

// Current odds for every watched House district, batched into one request:
// { "CA-41": { code, sources:[...] }, ... }
let houseRacesPromise = null;
export function fetchHouseRaces() {
  if (!houseRacesPromise) {
    houseRacesPromise = fromBootstrap(
      (b) => b.houseRaces,
      () => getJson("/api/house-races", "house-races")
    ).catch((e) => {
      houseRacesPromise = null;
      throw e;
    });
  }
  return houseRacesPromise;
}

// Per-state senate polling is batched: one /api/race-polls fetch returns every state,
// so we download VoteHub's full poll list once instead of per drawer open.
let allRacePollsPromise = null;
function fetchAllRacePolls() {
  if (!allRacePollsPromise) {
    allRacePollsPromise = fromBootstrap(
      (b) => b.racePolls,
      () => getJson("/api/race-polls", "race-polls")
    ).catch((e) => {
      allRacePollsPromise = null;
      throw e;
    });
  }
  return allRacePollsPromise;
}

// { stateCode, dem, rep, n, lastUpdated, trend:[{t,dem,rep}] }
export async function fetchRacePolls(stateCode) {
  const all = await fetchAllRacePolls();
  return (
    all[stateCode] || { stateCode, dem: null, rep: null, n: 0, lastUpdated: null, trend: [] }
  );
}

// Market-range ids in fetch order. Mirrors MARKET_RANGES in
// src/components/RangeSelector.jsx (id field only — label/days stay there,
// they're UI concerns) — src/lib must not import from src/components, so this
// list is duplicated; keep it in sync if RangeSelector's ranges change.
const MARKET_RANGE_IDS = ["all", "90d", "30d", "7d", "24h"];

// Run `fn(id)` for every market range except `current` (already being fetched
// by the caller), one at a time. Sequential on purpose: 3 of the 5 ranges
// proxy through the Vercel origin, and bursting all 4 remaining requests at
// once per chart expand is exactly the kind of fan-out this file otherwise
// avoids (see prefetchRaces below) — the user is looking at `current` already,
// there's no rush on the rest. `shouldContinue`, if given, is checked before
// each request so a caller can abandon an in-flight sweep (e.g. the drawer
// moved to a different race) without it keeping firing requests in the
// background.
async function sweepMarketRanges(current, fn, shouldContinue) {
  for (const id of MARKET_RANGE_IDS) {
    if (id === current) continue;
    if (shouldContinue && !shouldContinue()) return;
    await fn(id).catch(() => {});
  }
}

// One sweep per key ("control", or `race:${stateCode}`) per session — the
// per-range memoization above already dedupes actual network calls, this just
// stops re-expanding the same panel from re-walking the range list.
const prefetchedSweeps = new Set();

// Schedule a sweep off the critical path. Deliberately a plain timer and NOT
// requestIdleCallback: rIC never fires while the document is hidden, so
// opening the dashboard in a background tab (middle-click, "open in new tab")
// silently skipped the whole sweep. Timers still fire there — throttled, which
// is fine for a prefetch. The delay is belt-and-braces anyway: callers only
// invoke this once the fetch the user is actually waiting on has resolved.
//
// The dedupe key is claimed INSIDE the callback, not at schedule time, so a
// sweep that never got to run can't permanently mark itself done — that was
// the other half of the background-tab bug.
function scheduleSweep(key, current, fn, shouldContinue) {
  if (prefetchedSweeps.has(key)) return;
  setTimeout(() => {
    if (prefetchedSweeps.has(key)) return;
    if (shouldContinue && !shouldContinue()) return;
    prefetchedSweeps.add(key);
    sweepMarketRanges(current, fn, shouldContinue);
  }, 500);
}

// Quietly warm the other control-history ranges once the panel the user
// opened has loaded, so flipping Senate/House Control's range selector is
// instant. Called from MacroMetrics only after the current range's fetch
// succeeds — never on page load (bootstrap must stay the only request a
// visitor who never expands a chart pays for).
export function prefetchControlHistoryRanges(current = "all") {
  scheduleSweep("control", current, fetchControlHistory);
}

// Same idea for a race's provider history. `shouldContinue` lets RaceDrawer
// cancel an in-flight sweep when the user has since moved on to another race
// (see the drawer's effect) — without it, rapidly clicking through states
// with a chart expanded could leave several abandoned sweeps still issuing
// requests for races no longer on screen.
export function prefetchRaceHistoryRanges(stateCode, current = "all", shouldContinue) {
  scheduleSweep(
    `race:${stateCode}`,
    current,
    (id) => fetchRaceHistory(stateCode, id),
    shouldContinue
  );
}

// Warm the caches in the background on app load so drawers open quickly. All of
// these resolve off the single shared /api/bootstrap payload (extra network
// requests happen only for pieces bootstrap couldn't supply). History and news
// are loaded lazily when a drawer opens (RaceDrawer fetches them on open) —
// don't add them here: prefetching them for all 9 states at once bursts the
// upstreams on the live-fallback path.
export function prefetchRaces(stateCodes) {
  fetchAllRacePolls().catch(() => {});
  fetchHouseRaces().catch(() => {});
  for (const sc of stateCodes) {
    fetchRaceOdds(sc).catch(() => {});
  }
}

// True when a normalized source actually carries odds.
export function sourceHasData(s) {
  return Boolean(s && s.demYes != null && s.repYes != null);
}
