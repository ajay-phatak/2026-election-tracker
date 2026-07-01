// Scheduled warmer for the Workers KV data layer (see docs/kv-warmer-plan.md).
// A token-gated cron endpoint (driven by a GitHub Actions schedule) that fills the
// aggregate KV keys the read path in functions/api/[[route]].js serves from, so
// user reads hit KV and scale independently of the rate-limited free upstreams.
//
// MARKETS — ORIGIN-MIRROR: fetching Kalshi/Polymarket/VoteHub directly from the
// warmer blows the free Workers 50-subrequest cap, because Cloudflare's shared,
// rate-limited egress IP fans each fetch into many retried subrequests. So for the
// market/poll keys we instead pull the already-assembled JSON from a clean-IP
// origin that has done that work — the app's Vercel deployment, whose egress isn't
// rate-limited. Each key is then one reliable subrequest. WARM_ORIGIN overrides the
// default origin (a Pages env var).
//
// NEWS — DIRECT, SLOW: news is the opposite case. GNews is key-based and NOT
// IP-rate-limited (that's why the app moved off the IP-blocked Google RSS), but it
// has a hard ~100 requests/day free quota. So news is fetched DIRECTLY here with
// Cloudflare's own NEWS_API_KEY (no dependency on the origin having a news key) and
// warmed on a SEPARATE, infrequent schedule (the cron's `news` group, ~every 3h =
// 9 states x 8 = ~72 calls/day, under quota). Warming 9 states every 15 min would
// have blown the quota. A guard keeps the last-good news in KV if a whole run comes
// back empty (transient GNews failure), so it never wipes good data.
//
// Pages routes this static file ahead of the [[route]] catch-all, so /api/refresh
// lands here.

import { WATCHED_RACES } from "../../src/config/races.config.js";
import { getRaceNews } from "../../api/_news.js";

const SENATE_STATES = WATCHED_RACES.senate.map((r) => r.stateCode);

const DEFAULT_ORIGIN = "https://2026-election-tracker.vercel.app";

// ?only= groups. `markets` = everything the origin serves (core + races +
// histories), warmed frequently. `news` is warmed on its own slow schedule. `all`
// = markets + news (for a manual/local full warm). The granular core/races/
// histories groups remain as a safety valve. Each group stays well under the
// 50-subrequest cap.
const GROUPS = ["all", "markets", "core", "races", "histories", "news"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

// Rough item count for the cron summary — array length, object key count, or 1.
function countOf(data) {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === "object") return Object.keys(data).length;
  return data == null ? 0 : 1;
}

// Fetch JSON from the origin with a light retry (the origin is reliable, so this
// is for transient hiccups/cold starts, not the upstream rate-limit storms the
// direct path suffered). Don't retry 4xx other than 429.
async function fetchJson(url, attempts = 2) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (r.ok) return r.json();
      lastErr = new Error(`${url} -> ${r.status}`);
      if (r.status < 500 && r.status !== 429) break;
    } catch (e) {
      lastErr = e;
    }
    if (i < attempts - 1) await sleep(400);
  }
  throw lastErr;
}

// Fetch one aggregate value and write it to KV as a { data, updatedAt } envelope
// (so the read path can observe staleness). Never throws: a failed key is recorded
// in the summary and the remaining keys still run/write. Returns the data on
// success (so callers can compose the bootstrap key from it), undefined on failure.
async function writeKey(kv, summary, key, produce) {
  try {
    const data = await produce();
    await kv.put(key, JSON.stringify({ data, updatedAt: Date.now() }));
    summary.written.push(key);
    summary.counts[key] = countOf(data);
    return data;
  } catch (e) {
    summary.failures.push(`${key}: ${String(e?.message || e)}`);
    return undefined;
  }
}

// Build a { [stateCode]: value } aggregate by calling `perState` for each senate
// state SEQUENTIALLY (paced). Per-state try/catch records failures and keeps going,
// so the read path live-falls-back for any state we couldn't get. The stored value
// is exactly what the per-state route/provider returns, so the read path indexes
// it directly.
async function buildByState(label, perState, summary) {
  const out = {};
  for (const st of SENATE_STATES) {
    try {
      const v = await perState(st);
      if (v != null) out[st] = v;
      else summary.failures.push(`${label}:${st}: null`);
    } catch (e) {
      summary.failures.push(`${label}:${st}: ${String(e?.message || e)}`);
    }
  }
  return out;
}

// GNews' free tier rate-limits bursts: in a rapid sequence only the first request
// lands and the rest 429. So fetch news for one state with strict mode (throws on a
// 429 instead of swallowing it to empty) and retry with backoff. The caller also
// paces between states; this retry just catches stragglers.
async function newsForState(st, newsKey) {
  const RETRIES = 3;
  for (let attempt = 0; ; attempt++) {
    try {
      return await getRaceNews(st, newsKey, { strict: true });
    } catch (e) {
      if (attempt >= RETRIES) throw e;
      await sleep(1200 * (attempt + 1) + Math.floor(Math.random() * 400));
    }
  }
}

async function runGroup(group, origin, newsKey, kv, summary) {
  // `markets` (and `all`) warm everything the origin serves; news is separate.
  const markets = group === "all" || group === "markets";

  // First-paint pieces captured as they're warmed, then composed into the
  // `bootstrap` KV key below so the client's initial load is ONE request
  // (/api/bootstrap) instead of ~13. control-history/histories/news stay out —
  // the client loads those lazily.
  const pieces = {};

  if (markets || group === "core") {
    // Origin endpoints that are already aggregated server-side -> one fetch each.
    pieces.control = await writeKey(kv, summary, "control", () => fetchJson(`${origin}/api/control`));
    await writeKey(kv, summary, "control-history", () => fetchJson(`${origin}/api/control-history`));
    pieces.polls = await writeKey(kv, summary, "polls", () => fetchJson(`${origin}/api/polls`));
    pieces.houseRaces = await writeKey(kv, summary, "house-races", () => fetchJson(`${origin}/api/house-races`));
    pieces.racePolls = await writeKey(kv, summary, "race-polls", () => fetchJson(`${origin}/api/race-polls`));
  }
  if (markets || group === "races") {
    pieces.races = await writeKey(kv, summary, "races", () =>
      buildByState("races", (st) => fetchJson(`${origin}/api/race?state=${st}`), summary)
    );
  }
  if (markets || group === "core" || group === "races") {
    // Merge this run's pieces over the previous bootstrap value so a piece that
    // failed this run (or a granular core/races-only run) never wipes a
    // previously-good piece. Empty results count as failed, same idea as the
    // news last-good guard.
    await writeKey(kv, summary, "bootstrap", async () => {
      let prev = {};
      try {
        prev = JSON.parse(await kv.get("bootstrap"))?.data || {};
      } catch {
        // no/unreadable previous value -> start fresh
      }
      const merged = { ...prev };
      for (const [k, v] of Object.entries(pieces)) {
        if (v != null && countOf(v) > 0) merged[k] = v;
      }
      return merged;
    });
  }
  if (markets || group === "histories") {
    await writeKey(kv, summary, "histories", () =>
      buildByState("histories", (st) => fetchJson(`${origin}/api/history?state=${st}`), summary)
    );
  }
  if (group === "all" || group === "news") {
    // News is fetched DIRECTLY from GNews with Cloudflare's own key (not via the
    // origin), and GNews 429s rapid bursts, so walk the states SEQUENTIALLY with a
    // pause between each so every call lands (vs. only the first one). This runs on
    // its own slow ~3h schedule so the ~9 calls/run stay under GNews' daily quota.
    const news = {};
    for (let i = 0; i < SENATE_STATES.length; i++) {
      const st = SENATE_STATES[i];
      if (i > 0) await sleep(1200); // pace so we stay under GNews' per-second/burst limit
      try {
        news[st] = await newsForState(st, newsKey);
      } catch (e) {
        summary.failures.push(`news:${st}: ${String(e?.message || e)}`);
      }
    }
    const hasAny = Object.values(news).some((d) => (d?.articles?.length || 0) > 0);
    if (hasAny) {
      await writeKey(kv, summary, "news", async () => news);
    } else {
      // Whole run came back empty -> almost certainly a transient GNews failure or
      // a missing key, not 9 genuinely newsless races. Keep the last-good KV value.
      summary.failures.push("news: all states empty — kept previous KV value (verify NEWS_API_KEY)");
    }
  }
}

// Handle any method (the cron may GET or POST). Auth is a shared secret compared
// against env.REFRESH_TOKEN, passed as the X-Refresh-Token header or ?token=.
export async function onRequest({ request, env }) {
  const token = env?.REFRESH_TOKEN;
  // No token configured -> deny rather than expose an open warmer (e.g. local dev
  // or before the Pages secret is set). The cron simply can't run until it's set.
  if (!token) return json({ error: "refresh not configured (no REFRESH_TOKEN)" }, 503);

  const url = new URL(request.url);
  const provided = request.headers.get("x-refresh-token") || url.searchParams.get("token") || "";
  if (provided !== token) return json({ error: "unauthorized" }, 401);

  const kv = env?.MARKET_CACHE;
  if (!kv) return json({ error: "no MARKET_CACHE binding" }, 503);

  const origin = (env.WARM_ORIGIN || DEFAULT_ORIGIN).replace(/\/+$/, "");
  const group = (url.searchParams.get("only") || "all").toLowerCase();
  if (!GROUPS.includes(group)) {
    return json({ error: `unknown group '${group}' (use ${GROUPS.join("|")})` }, 400);
  }

  const summary = {
    group,
    origin,
    startedAt: new Date().toISOString(),
    written: [],
    counts: {},
    failures: [],
  };
  await runGroup(group, origin, env.NEWS_API_KEY, kv, summary);
  summary.finishedAt = new Date().toISOString();

  // 207 (Multi-Status) when some keys failed but others were written, so the cron
  // logs surface partial refreshes without treating them as total failures.
  return json(summary, summary.failures.length ? 207 : 200);
}
