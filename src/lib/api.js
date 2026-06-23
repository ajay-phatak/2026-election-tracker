// Client-side helpers that hit our serverless proxy (/api/*), which normalizes
// Kalshi + Polymarket into { sources: [{ id, label, demYes, repYes, lastUpdated }] }.
//
// Per-state requests are memoized for the session (only 9 states) and prefetched on
// app load via prefetchRaces(), so opening a race drawer is instant. Reload to refresh.

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

export function fetchControl() {
  return getJson("/api/control", "control");
}

// Macro polling averages + trend: { genericBallot:{dem,rep,n,lastUpdated,trend}, approval:{...} }
export function fetchPolls() {
  return getJson("/api/polls", "polls");
}

// Win-probability history for the control markets: { senate:{sources}, house:{sources} }
export function fetchControlHistory() {
  return getJson("/api/control-history", "control-history");
}

const oddsCache = new Map();
export function fetchRaceOdds(stateCode) {
  return memoize(oddsCache, stateCode, () =>
    getJson(`/api/race?state=${encodeURIComponent(stateCode)}`, "race")
  );
}

// Historical win-probability time-series per provider: { sources: [{ id, label, points:[{t,dem,rep}], hasData }] }
const historyCache = new Map();
export function fetchRaceHistory(stateCode) {
  return memoize(historyCache, stateCode, () =>
    getJson(`/api/history?state=${encodeURIComponent(stateCode)}`, "history")
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
    houseRacesPromise = getJson("/api/house-races", "house-races").catch((e) => {
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
    allRacePollsPromise = getJson("/api/race-polls", "race-polls").catch((e) => {
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

// Warm the caches in the background on app load so drawers open quickly. Only the
// light current-odds call is prefetched per state; history and news are loaded
// lazily when a drawer opens (RaceDrawer fetches them on open). Prefetching them
// for all 9 states at once bursts the upstreams — Kalshi rate-limits the candle
// history and GNews throttles the news, leaving both empty on Cloudflare's shared
// egress. Fetching on demand keeps each to a single request.
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
