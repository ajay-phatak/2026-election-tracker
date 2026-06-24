// Scheduled warmer for the Workers KV data layer (see docs/kv-warmer-plan.md).
// A token-gated cron endpoint (driven by a GitHub Actions schedule) that fills the
// aggregate KV keys the read path in functions/api/[[route]].js serves from, so
// user reads hit KV and scale independently of the rate-limited free upstreams.
//
// ORIGIN-MIRROR DESIGN: rather than fetch the upstreams (Kalshi/Polymarket/GNews)
// directly — which from Cloudflare's shared, rate-limited egress IP fans each
// logical fetch into many retried subrequests and blows the free Workers
// 50-subrequest cap — we pull the already-assembled JSON from a clean-IP origin
// that has done that work: the app's own Vercel deployment (whose egress isn't
// rate-limited). Each KV key is then ONE reliable subrequest, so a full warm is
// ~32 fetches (well under 50) with complete data. Vercel thus acts as the data
// origin and Cloudflare as a cached global serving layer. WARM_ORIGIN overrides
// the default origin (a Pages env var); no providers/keys are needed here — the
// origin owns the upstream fetching and the NEWS_API_KEY.
//
// Pages routes this static file ahead of the [[route]] catch-all, so /api/refresh
// lands here.

import { WATCHED_RACES } from "../../src/config/races.config.js";

const SENATE_STATES = WATCHED_RACES.senate.map((r) => r.stateCode);

const DEFAULT_ORIGIN = "https://2026-election-tracker.vercel.app";

// ?only= groups, sized so each invocation stays well under the 50-subrequest cap
// even if the origin needs a retry. `all` (the default) warms everything in one
// invocation (~32 fetches); the granular groups are a safety valve if the watched
// state list grows or the origin gets slow.
const GROUPS = ["all", "core", "races", "histories", "news"];

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
// in the summary and the remaining keys still run/write.
async function writeKey(kv, summary, key, produce) {
  try {
    const data = await produce();
    await kv.put(key, JSON.stringify({ data, updatedAt: Date.now() }));
    summary.written.push(key);
    summary.counts[key] = countOf(data);
  } catch (e) {
    summary.failures.push(`${key}: ${String(e?.message || e)}`);
  }
}

// Build a { [stateCode]: value } aggregate by hitting the origin's per-state route
// for each senate state SEQUENTIALLY (paced). Per-state try/catch records failures
// and keeps going, so the read path live-falls-back for any state we couldn't get.
// The stored per-state value is exactly what the origin's /api/<route>?state=XX
// returns — same shape getRace/getRaceHistory/getRaceNews produce — so the read
// path indexes it directly.
async function buildByState(origin, route, label, summary) {
  const out = {};
  for (const st of SENATE_STATES) {
    try {
      out[st] = await fetchJson(`${origin}/api/${route}?state=${st}`);
    } catch (e) {
      summary.failures.push(`${label}:${st}: ${String(e?.message || e)}`);
    }
  }
  return out;
}

async function runGroup(group, origin, kv, summary) {
  const all = group === "all";

  if (all || group === "core") {
    // Origin endpoints that are already aggregated server-side -> one fetch each.
    await writeKey(kv, summary, "control", () => fetchJson(`${origin}/api/control`));
    await writeKey(kv, summary, "control-history", () => fetchJson(`${origin}/api/control-history`));
    await writeKey(kv, summary, "polls", () => fetchJson(`${origin}/api/polls`));
    await writeKey(kv, summary, "house-races", () => fetchJson(`${origin}/api/house-races`));
    await writeKey(kv, summary, "race-polls", () => fetchJson(`${origin}/api/race-polls`));
  }
  if (all || group === "races") {
    await writeKey(kv, summary, "races", () => buildByState(origin, "race", "races", summary));
  }
  if (all || group === "histories") {
    await writeKey(kv, summary, "histories", () => buildByState(origin, "history", "histories", summary));
  }
  if (all || group === "news") {
    await writeKey(kv, summary, "news", () => buildByState(origin, "race-news", "news", summary));
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
  await runGroup(group, origin, kv, summary);
  summary.finishedAt = new Date().toISOString();

  // 207 (Multi-Status) when some keys failed but others were written, so the cron
  // logs surface partial refreshes without treating them as total failures.
  return json(summary, summary.failures.length ? 207 : 200);
}
