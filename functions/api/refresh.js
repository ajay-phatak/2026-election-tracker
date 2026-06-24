// Scheduled warmer for the Workers KV data layer. A token-gated cron endpoint
// (driven by a GitHub Actions schedule) that fetches every upstream at a paced,
// controlled rate and writes the aggregate KV keys the read path in
// functions/api/[[route]].js serves from. Decoupling the warmer from user
// traffic is the whole point: user reads hit KV and scale independently of the
// rate-limited free upstreams (Kalshi/Polymarket/VoteHub/GNews).
//
// Pages routes this static file ahead of the [[route]] catch-all, so /api/refresh
// lands here. It reuses the same framework-agnostic providers, unchanged.
//
// CHUNKING: Cloudflare's free Workers plan caps a single invocation at 50
// subrequests. A full warm of all 8 keys is ~100+ upstream fetches, so we split
// into groups (?only=core|house|races|histories) that each stay under the ceiling;
// the cron calls each group as its own invocation. No ?only= (or ?only=all) warms
// everything in one shot — fine on the paid plan or locally, over the cap on free.

import {
  getControl,
  getControlHistory,
  getAllHouseRaces,
  getRace,
  getRaceHistory,
} from "../../api/_providers.js";
import { getAllRacePolls, getMacroPolls } from "../../api/_polls.js";
import { getRaceNews } from "../../api/_news.js";
import { WATCHED_RACES } from "../../src/config/races.config.js";

const SENATE_STATES = WATCHED_RACES.senate.map((r) => r.stateCode);

const GROUPS = ["all", "core", "house", "races", "histories"];

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

// Fetch one aggregate value and write it to KV as a { data, updatedAt } envelope
// (so the read path can observe staleness). Never throws: a failed source is
// recorded in the summary and the remaining sources still run/write.
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

// Build a { [stateCode]: value } aggregate by calling `fn` per state SEQUENTIALLY
// (paced — one state's fetches finish before the next starts, so we never burst
// the upstreams). Per-state try/catch records failures and keeps going, so the
// returned object is whatever succeeded — even if a later state hits the 50-
// subrequest cap, the prefix is preserved and the read path live-falls-back for
// the rest.
async function buildByState(label, states, fn, summary) {
  const out = {};
  for (const st of states) {
    try {
      const v = await fn(st);
      if (v != null) out[st] = v;
      else summary.failures.push(`${label}:${st}: null`);
    } catch (e) {
      summary.failures.push(`${label}:${st}: ${String(e?.message || e)}`);
    }
  }
  return out;
}

async function runGroup(group, env, kv, summary) {
  const all = group === "all";

  if (all || group === "core") {
    await writeKey(kv, summary, "control", () => getControl());
    await writeKey(kv, summary, "control-history", () => getControlHistory());
    await writeKey(kv, summary, "polls", () => getMacroPolls());
    await writeKey(kv, summary, "race-polls", () => getAllRacePolls());
  }
  if (all || group === "house") {
    await writeKey(kv, summary, "house-races", () => getAllHouseRaces());
  }
  if (all || group === "races") {
    await writeKey(kv, summary, "races", () =>
      buildByState("races", SENATE_STATES, (s) => getRace(s), summary)
    );
    await writeKey(kv, summary, "news", () =>
      buildByState("news", SENATE_STATES, (s) => getRaceNews(s, env.NEWS_API_KEY), summary)
    );
  }
  if (all || group === "histories") {
    await writeKey(kv, summary, "histories", () =>
      buildByState("histories", SENATE_STATES, (s) => getRaceHistory(s), summary)
    );
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

  const group = (url.searchParams.get("only") || "all").toLowerCase();
  if (!GROUPS.includes(group)) {
    return json({ error: `unknown group '${group}' (use ${GROUPS.join("|")})` }, 400);
  }

  const summary = {
    group,
    startedAt: new Date().toISOString(),
    written: [],
    counts: {},
    failures: [],
  };
  await runGroup(group, env, kv, summary);
  summary.finishedAt = new Date().toISOString();

  // 207 (Multi-Status) when some sources failed but others were written, so the
  // cron logs surface partial refreshes without treating them as total failures.
  return json(summary, summary.failures.length ? 207 : 200);
}
