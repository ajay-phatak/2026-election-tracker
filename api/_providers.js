// Shared data-fetching + normalization for prediction-market providers.
// Used by the Vercel serverless functions in /api and by the Vite dev middleware,
// so it stays framework-agnostic (plain async functions, global fetch).
//
// Per the dashboard's design, we read the *Yes* price from BOTH the Democrat and
// the Republican market independently (rather than Yes + its complement). They may
// not sum to 100 — the UI renders the difference as a purple (>100) or grey (<100) band.
//
// Normalized source shape: { id, label, demYes, repYes, lastUpdated }
//   demYes / repYes: independent win probabilities (0-100) or null when unavailable.

import { WATCHED_RACES, CONTROL_MARKETS } from "../src/config/races.config.js";

// Resolve a watched race (senate or house) by its unique code. Senate races key
// on stateCode (GA), house races on code (CA-41).
function findRace(code) {
  return (
    [...WATCHED_RACES.senate, ...(WATCHED_RACES.house || [])].find(
      (r) => (r.code ?? r.stateCode) === code
    ) || null
  );
}

const PM_BASE = "https://gamma-api.polymarket.com";
// Polymarket 403s requests without a UA header.
const UA = "2026-election-tracker/1.0 (dashboard)";

// Edge-cache successful upstream GETs (Cloudflare Workers `caches`; a plain
// fetch in Node / local dev). Only 2xx responses are stored, so a rate-limit
// 429 never poisons a key — failures simply fall through and are retried on the
// next call. This lets the same market data be reused across the race / history
// / control endpoints and the client's prefetch burst instead of re-hitting
// (and tripping the rate limits of) Kalshi and Polymarket.
const EDGE_TTL = 180;
async function edgeFetch(url, init) {
  const cache = typeof caches !== "undefined" ? caches.default : null;
  if (!cache) return fetch(url, init);
  const key = new Request(url);
  try {
    const hit = await cache.match(key);
    if (hit) return hit;
  } catch {
    // ignore cache read errors and fetch normally
  }
  const res = await fetch(url, init);
  if (res.ok) {
    try {
      const headers = new Headers(res.headers);
      headers.set("Cache-Control", `s-maxage=${EDGE_TTL}`);
      await cache.put(
        key,
        new Response(res.clone().body, { status: res.status, statusText: res.statusText, headers })
      );
    } catch {
      // caching is best-effort — never let a cache write fail the request
    }
  }
  return res;
}

async function getJson(url) {
  const r = await edgeFetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

// 0-1 probability -> 0-100 with one decimal.
function toPct(x) {
  if (x == null) return null;
  const n = Number(x);
  return Number.isFinite(n) ? Math.round(n * 1000) / 10 : null;
}

// ---- Polymarket (Gamma) -------------------------------------------------
// Events come in two shapes:
//   • aggregate party markets — "Will the Democrats/Republicans win…" (often
//     with the candidate as the groupItemTitle, e.g. "Sherrod Brown (D)");
//   • per-candidate markets — one Yes/No market per candidate with no party
//     word at all (e.g. Alaska: "Mary Peltola", "Dan Sullivan").
// `partyHints` ({ dem:[names], rep:[names] }, from the race's pollParties) lets
// us classify the latter; the leading candidate represents each side.
function marketSide(m, partyHints) {
  const text = `${m.groupItemTitle || ""} ${m.question || ""}`.toLowerCase();
  if (text.includes("democrat")) return "dem";
  if (text.includes("republican")) return "rep";
  const has = (arr) => arr?.some((n) => text.includes(String(n).toLowerCase()));
  if (has(partyHints?.dem)) return "dem";
  if (has(partyHints?.rep)) return "rep";
  return null;
}

// Parse a sub-market's Yes price (0-1) or null.
function marketYes(m) {
  if (!m.outcomePrices) return null;
  try {
    const outcomes = JSON.parse(m.outcomes);
    const prices = JSON.parse(m.outcomePrices);
    const yesIdx = outcomes.findIndex((o) => String(o).toLowerCase() === "yes");
    const yes = yesIdx >= 0 ? prices[yesIdx] : prices[0];
    const n = Number(yes);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function polymarketBySlug(slug, partyHints) {
  if (!slug) return { demYes: null, repYes: null };
  try {
    const data = await getJson(`${PM_BASE}/events?slug=${encodeURIComponent(slug)}`);
    const ev = Array.isArray(data) ? data[0] : null;
    if (!ev || !ev.markets) return { demYes: null, repYes: null };

    let demYes = null;
    let repYes = null;
    for (const m of ev.markets) {
      const yes = marketYes(m);
      if (yes == null) continue;
      const side = marketSide(m, partyHints);
      // Per-candidate events have several markets per side — keep the front-runner.
      if (side === "dem") demYes = demYes == null ? toPct(yes) : Math.max(demYes, toPct(yes));
      else if (side === "rep") repYes = repYes == null ? toPct(yes) : Math.max(repYes, toPct(yes));
    }
    return { demYes, repYes };
  } catch {
    return { demYes: null, repYes: null };
  }
}

// ---- Kalshi (live on the elections host w/ candlestick price + volume history) ----
const KALSHI_ELECTIONS = "https://api.elections.kalshi.com/trade-api/v2";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The elections host rate-limits bursts (HTTP 429 after ~5 rapid requests). Serialize
// all requests to it through one chain and retry 429s with backoff.
let kalshiChain = Promise.resolve();
function kalshiFetch(url) {
  const exec = async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const r = await edgeFetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (r.status === 429) {
        await sleep(250 * (attempt + 1));
        continue;
      }
      if (!r.ok) throw new Error(`${url} -> ${r.status}`);
      return r.json();
    }
    throw new Error(`${url} -> 429 (retries exhausted)`);
  };
  const run = kalshiChain.then(exec, exec);
  kalshiChain = run.then(
    () => {},
    () => {}
  );
  return run;
}

// Daily candles for one Kalshi market -> [{ t, p (0-100), vol }]. Empty on failure.
async function kalshiCandles(series, ticker, { days = 730 } = {}) {
  if (!series || !ticker) return [];
  // Snap end_ts to the edge-cache window so the candle URL is stable within it
  // (a per-second timestamp would make every request a fresh cache key/miss).
  const end = Math.floor(Date.now() / 1000 / EDGE_TTL) * EDGE_TTL;
  const start = end - days * 86400;
  try {
    const d = await kalshiFetch(
      `${KALSHI_ELECTIONS}/series/${series}/markets/${ticker}/candlesticks?period_interval=1440&start_ts=${start}&end_ts=${end}`
    );
    return (d.candlesticks || [])
      .map((c) => ({
        t: c.end_period_ts,
        p: c.price?.close_dollars != null ? Math.round(parseFloat(c.price.close_dollars) * 1000) / 10 : null,
        vol: c.volume_fp != null ? Math.round(parseFloat(c.volume_fp)) : 0,
      }))
      .filter((x) => x.p != null);
  } catch {
    return [];
  }
}

// Build a candlestick cfg for a watched race from its kalshiMarketId (series ticker).
function kalshiCfgForRace(race) {
  const s = race.kalshiMarketId;
  return s ? { series: s, demTicker: `${s}-26-D`, repTicker: `${s}-26-R` } : null;
}

// Current Kalshi odds from the latest candle close (control markets + state races).
async function kalshiCandleOdds(cfg) {
  if (!cfg) return { demYes: null, repYes: null };
  const [dem, rep] = await Promise.all([
    kalshiCandles(cfg.series, cfg.demTicker, { days: 10 }),
    kalshiCandles(cfg.series, cfg.repTicker, { days: 10 }),
  ]);
  return {
    demYes: dem.length ? dem[dem.length - 1].p : null,
    repYes: rep.length ? rep[rep.length - 1].p : null,
  };
}

// Full Kalshi candle history -> { points:[{t,dem,rep,volume}], hasData }.
async function kalshiCandleHistory(cfg) {
  if (!cfg) return { points: [], hasData: false };
  const [dem, rep] = await Promise.all([
    kalshiCandles(cfg.series, cfg.demTicker),
    kalshiCandles(cfg.series, cfg.repTicker),
  ]);
  const day = (t) => Math.floor(t / 86400) * 86400;
  const demByT = new Map(dem.map((x) => [day(x.t), x]));
  const repByT = new Map(rep.map((x) => [day(x.t), x]));
  const times = [...new Set([...demByT.keys(), ...repByT.keys()])].sort((a, b) => a - b);
  const points = times.map((t) => {
    const dd = demByT.get(t);
    const rr = repByT.get(t);
    return { t, dem: dd ? dd.p : null, rep: rr ? rr.p : null, volume: (dd ? dd.vol : 0) + (rr ? rr.vol : 0) };
  });
  return { points, hasData: points.length > 0 };
}

// ---- Compose ------------------------------------------------------------
// Build the two-source { polymarket, kalshi } current-odds shape.
async function buildSourcesFrom(polymarketSlug, kalshiCfg, partyHints) {
  const now = new Date().toISOString();
  const [pm, ks] = await Promise.all([
    polymarketBySlug(polymarketSlug, partyHints),
    kalshiCandleOdds(kalshiCfg),
  ]);
  const mk = (id, label, r) => ({
    id,
    label,
    demYes: r.demYes,
    repYes: r.repYes,
    lastUpdated: r.demYes != null || r.repYes != null ? now : null,
  });
  return { sources: [mk("polymarket", "Polymarket", pm), mk("kalshi", "Kalshi", ks)] };
}

export async function getControl() {
  const [senate, house] = await Promise.all([
    buildSourcesFrom(CONTROL_MARKETS.senate.polymarketSlug, CONTROL_MARKETS.senate.kalshi),
    buildSourcesFrom(CONTROL_MARKETS.house.polymarketSlug, CONTROL_MARKETS.house.kalshi),
  ]);
  return { senate, house };
}

export async function getRace(stateCode) {
  const race = findRace(stateCode);
  if (!race) return null;
  const { sources } = await buildSourcesFrom(
    race.polymarketSlug,
    kalshiCfgForRace(race),
    race.pollParties
  );
  return { stateCode, sources };
}

// Batched current odds for every watched House district -> { "CA-41": { sources }, ... }.
// One client fetch fans out here (mirrors getAllRacePolls), Polymarket-only since
// House districts have no liquid Kalshi markets.
export async function getAllHouseRaces() {
  const races = WATCHED_RACES.house || [];
  const entries = await Promise.all(
    races.map(async (race) => {
      const { sources } = await buildSourcesFrom(race.polymarketSlug, null, race.pollParties);
      return [race.code, { code: race.code, sources }];
    })
  );
  return Object.fromEntries(entries);
}

// ---- Historical odds (time-series) -------------------------------------

const CLOB_BASE = "https://clob.polymarket.com";

const num = (x) => (x == null || Number.isNaN(Number(x)) ? null : Number(x));

// The Yes-token clob ids for the Democrat/Republican sub-markets of an event,
// plus the event-level aggregate volume/liquidity (cumulative across the markets).
async function polymarketTokens(slug, partyHints) {
  if (!slug) return { demToken: null, repToken: null, volume: null };
  try {
    const data = await getJson(`${PM_BASE}/events?slug=${encodeURIComponent(slug)}`);
    const ev = Array.isArray(data) ? data[0] : null;
    if (!ev || !ev.markets) return { demToken: null, repToken: null, volume: null };
    let demToken = null;
    let repToken = null;
    // Track the leading candidate per side so the history line follows the same
    // market shown in the current odds (matters for per-candidate events).
    let demYes = -1;
    let repYes = -1;
    for (const m of ev.markets) {
      if (!m.clobTokenIds) continue;
      let ids;
      try {
        ids = JSON.parse(m.clobTokenIds);
      } catch {
        continue;
      }
      const side = marketSide(m, partyHints);
      if (!side) continue;
      const yes = marketYes(m) ?? 0;
      if (side === "dem" && yes > demYes) {
        demYes = yes;
        demToken = ids[0];
      } else if (side === "rep" && yes > repYes) {
        repYes = yes;
        repToken = ids[0];
      }
    }
    const volume = {
      total: num(ev.volume),
      h24: num(ev.volume24hr),
      week: num(ev.volume1wk),
      liquidity: num(ev.liquidity),
    };
    return { demToken, repToken, volume };
  } catch {
    return { demToken: null, repToken: null, volume: null };
  }
}

// fidelity is the candle width in minutes (1440 = daily).
async function pricesHistory(token, fidelity = 1440) {
  if (!token) return [];
  try {
    const d = await getJson(
      `${CLOB_BASE}/prices-history?market=${token}&interval=max&fidelity=${fidelity}`
    );
    return (d.history || []).map((pt) => ({ t: pt.t, p: Math.round(pt.p * 1000) / 10 }));
  } catch {
    return [];
  }
}

// Align the two Yes-token series into [{ t, dem, rep }]. Snap to the UTC day so the
// two tokens (whose candle timestamps differ by a few seconds) line up instead of
// producing alternating half-null rows.
function mergeSeries(dem, rep) {
  const day = (t) => Math.floor(t / 86400) * 86400;
  const demByT = new Map(dem.map((x) => [day(x.t), x.p]));
  const repByT = new Map(rep.map((x) => [day(x.t), x.p]));
  const times = [...new Set([...demByT.keys(), ...repByT.keys()])].sort((a, b) => a - b);
  return times.map((t) => ({ t, dem: demByT.get(t) ?? null, rep: repByT.get(t) ?? null }));
}

// Polymarket win-probability history (price line + aggregate volume; no per-point volume).
async function polymarketEventHistory(slug, partyHints) {
  const { demToken, repToken, volume } = await polymarketTokens(slug, partyHints);
  const [dem, rep] = await Promise.all([pricesHistory(demToken), pricesHistory(repToken)]);
  const points = mergeSeries(dem, rep);
  return { points, hasData: points.length > 0, volume };
}

// Polymarket carries the price line (+ aggregate volume); Kalshi carries price +
// per-day volume bars (hasVolumeSeries). Shared by control markets and state races.
async function bothHistory(polymarketSlug, kalshiCfg, partyHints) {
  const [pm, ks] = await Promise.all([
    polymarketEventHistory(polymarketSlug, partyHints),
    kalshiCandleHistory(kalshiCfg),
  ]);
  return {
    sources: [
      { id: "polymarket", label: "Polymarket", points: pm.points, hasData: pm.hasData, volume: pm.volume },
      { id: "kalshi", label: "Kalshi", points: ks.points, hasData: ks.hasData, hasVolumeSeries: true },
    ],
  };
}

export async function getRaceHistory(stateCode) {
  const race = findRace(stateCode);
  if (!race) return null;
  return {
    stateCode,
    ...(await bothHistory(race.polymarketSlug, kalshiCfgForRace(race), race.pollParties)),
  };
}

export async function getControlHistory() {
  const [senate, house] = await Promise.all([
    bothHistory(CONTROL_MARKETS.senate.polymarketSlug, CONTROL_MARKETS.senate.kalshi),
    bothHistory(CONTROL_MARKETS.house.polymarketSlug, CONTROL_MARKETS.house.kalshi),
  ]);
  return { senate, house };
}
