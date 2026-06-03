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

const PM_BASE = "https://gamma-api.polymarket.com";
const KALSHI_BASE = "https://external-api.kalshi.com/trade-api/v2";
// Polymarket 403s requests without a UA header.
const UA = "2026-election-tracker/1.0 (dashboard)";

async function getJson(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
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
// Events expose party-named sub-markets ("Democratic Party"/"Democrat",
// "Republican Party"/"Republican"), each a Yes/No binary.
async function polymarketBySlug(slug) {
  if (!slug) return { demYes: null, repYes: null };
  try {
    const data = await getJson(`${PM_BASE}/events?slug=${encodeURIComponent(slug)}`);
    const ev = Array.isArray(data) ? data[0] : null;
    if (!ev || !ev.markets) return { demYes: null, repYes: null };

    let demYes = null;
    let repYes = null;
    for (const m of ev.markets) {
      if (!m.outcomePrices) continue;
      let outcomes;
      let prices;
      try {
        outcomes = JSON.parse(m.outcomes);
        prices = JSON.parse(m.outcomePrices);
      } catch {
        continue;
      }
      const yesIdx = outcomes.findIndex((o) => String(o).toLowerCase() === "yes");
      const yes = yesIdx >= 0 ? prices[yesIdx] : prices[0];
      const title = (m.groupItemTitle || m.question || "").toLowerCase();
      if (title.includes("democrat")) demYes = toPct(yes);
      else if (title.includes("republican")) repYes = toPct(yes);
    }
    return { demYes, repYes };
  } catch {
    return { demYes: null, repYes: null };
  }
}

// ---- Kalshi -------------------------------------------------------------
// Prices are integer cents (0-100). Many 2026 markets are illiquid -> null.
function kalshiPrice(m) {
  if (!m) return null;
  if (m.last_price != null && m.last_price > 0) return m.last_price;
  if (m.yes_bid != null && m.yes_ask != null && (m.yes_bid > 0 || m.yes_ask > 0)) {
    return Math.round((m.yes_bid + m.yes_ask) / 2);
  }
  return null;
}

async function kalshiBySeries(series) {
  if (!series) return { demYes: null, repYes: null };
  try {
    const data = await getJson(
      `${KALSHI_BASE}/markets?series_ticker=${encodeURIComponent(series)}&limit=200`
    );
    const markets = data.markets || [];
    const party = (m) => {
      const sub = (m.yes_sub_title || m.subtitle || "").toLowerCase();
      const tk = (m.ticker || "").toUpperCase();
      if (sub.includes("democrat") || tk.endsWith("-D")) return "D";
      if (sub.includes("republican") || tk.endsWith("-R")) return "R";
      return null;
    };
    // Prefer current-cycle (2026) markets when several exist.
    const preferred = (arr) =>
      arr.find((m) => (m.ticker || "").includes("-26-")) || arr[0] || null;
    const dem = preferred(markets.filter((m) => party(m) === "D"));
    const rep = preferred(markets.filter((m) => party(m) === "R"));
    return { demYes: kalshiPrice(dem), repYes: kalshiPrice(rep) };
  } catch {
    return { demYes: null, repYes: null };
  }
}

// ---- Compose ------------------------------------------------------------
async function buildSources(polymarketSlug, kalshiMarketId) {
  const now = new Date().toISOString();
  const [pm, ks] = await Promise.all([
    polymarketBySlug(polymarketSlug),
    kalshiBySeries(kalshiMarketId),
  ]);
  const mk = (id, label, r) => ({
    id,
    label,
    demYes: r.demYes,
    repYes: r.repYes,
    // Stamp freshness only when the provider actually returned data.
    lastUpdated: r.demYes != null || r.repYes != null ? now : null,
  });
  return { sources: [mk("polymarket", "Polymarket", pm), mk("kalshi", "Kalshi", ks)] };
}

export async function getControl() {
  const [senate, house] = await Promise.all([
    buildSources(CONTROL_MARKETS.senate.polymarketSlug, CONTROL_MARKETS.senate.kalshiMarketId),
    buildSources(CONTROL_MARKETS.house.polymarketSlug, CONTROL_MARKETS.house.kalshiMarketId),
  ]);
  return { senate, house };
}

export async function getRace(stateCode) {
  const race = WATCHED_RACES.senate.find((r) => r.stateCode === stateCode);
  if (!race) return null;
  const { sources } = await buildSources(race.polymarketSlug, race.kalshiMarketId);
  return { stateCode, sources };
}

// ---- Historical odds (time-series) -------------------------------------

const CLOB_BASE = "https://clob.polymarket.com";

// The Yes-token clob id for the Democrat and Republican sub-markets of an event.
async function polymarketTokens(slug) {
  if (!slug) return { demToken: null, repToken: null };
  try {
    const data = await getJson(`${PM_BASE}/events?slug=${encodeURIComponent(slug)}`);
    const ev = Array.isArray(data) ? data[0] : null;
    if (!ev || !ev.markets) return { demToken: null, repToken: null };
    let demToken = null;
    let repToken = null;
    for (const m of ev.markets) {
      if (!m.clobTokenIds) continue;
      let ids;
      try {
        ids = JSON.parse(m.clobTokenIds);
      } catch {
        continue;
      }
      const title = (m.groupItemTitle || m.question || "").toLowerCase();
      if (title.includes("democrat")) demToken = ids[0];
      else if (title.includes("republican")) repToken = ids[0];
    }
    return { demToken, repToken };
  } catch {
    return { demToken: null, repToken: null };
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

// Align the two Yes-token series by timestamp into [{ t, dem, rep }].
function mergeSeries(dem, rep) {
  const repByT = new Map(rep.map((x) => [x.t, x.p]));
  const demByT = new Map(dem.map((x) => [x.t, x.p]));
  const times = [...new Set([...dem.map((x) => x.t), ...rep.map((x) => x.t)])].sort((a, b) => a - b);
  return times.map((t) => ({ t, dem: demByT.get(t) ?? null, rep: repByT.get(t) ?? null }));
}

export async function getRaceHistory(stateCode) {
  const race = WATCHED_RACES.senate.find((r) => r.stateCode === stateCode);
  if (!race) return null;
  const { demToken, repToken } = await polymarketTokens(race.polymarketSlug);
  const [dem, rep] = await Promise.all([pricesHistory(demToken), pricesHistory(repToken)]);
  const points = mergeSeries(dem, rep);
  return {
    stateCode,
    sources: [
      { id: "polymarket", label: "Polymarket", points, hasData: points.length > 0 },
      // Kalshi candlesticks exist but its 2026 markets are illiquid -> no history yet.
      { id: "kalshi", label: "Kalshi", points: [], hasData: false },
    ],
  };
}
