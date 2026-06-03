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

// Warm the caches in the background on app load so drawers open instantly.
export function prefetchRaces(stateCodes) {
  fetchAllRacePolls().catch(() => {});
  for (const sc of stateCodes) {
    fetchRaceOdds(sc).catch(() => {});
    fetchRaceHistory(sc).catch(() => {});
  }
}

// True when a normalized source actually carries odds.
export function sourceHasData(s) {
  return Boolean(s && s.demYes != null && s.repYes != null);
}
