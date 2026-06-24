// Cloudflare Pages Functions entry for every /api/* request. Replaces the Vercel
// serverless handlers that used to live in /api/*.js: it reuses the same
// framework-agnostic providers (../../api/_providers.js, _polls.js, _news.js)
// unchanged and only adapts them to the Web Fetch (Request -> Response) signature
// that Pages Functions use instead of Vercel's Node-style (req, res).
//
// This single catch-all ([[route]] matches /api/control, /api/race?state=GA, ...)
// keeps one place to route from; the data/normalization logic stays shared with
// the Vite dev middleware so local dev and production behave identically.

import {
  getControl,
  getRace,
  getControlHistory,
  getRaceHistory,
  getAllHouseRaces,
} from "../../api/_providers.js";
import { getRacePolls, getAllRacePolls, getMacroPolls } from "../../api/_polls.js";
import { getRaceNews } from "../../api/_news.js";

// Build a JSON Response, mirroring the Cache-Control values the Vercel handlers set.
function json(data, { status = 200, cache } = {}) {
  const headers = { "content-type": "application/json" };
  if (cache) headers["cache-control"] = cache;
  return new Response(JSON.stringify(data), { status, headers });
}

const missingState = () => json({ error: "missing ?state=" }, { status: 400 });
const unknownState = (state) => json({ error: `unknown state ${state}` }, { status: 404 });

// Read an aggregate key from Workers KV. The scheduled warmer (/api/refresh)
// stores each value as a { data, updatedAt } envelope; this returns the `data`,
// or undefined when there's nothing usable to serve — i.e. the binding is absent
// (local Vite dev has no env), the key is cold (before the first refresh), or the
// value can't be parsed. Every caller falls back to a live provider call in those
// cases, so a missing/empty KV never blanks a response.
async function kvGet(env, key) {
  const kv = env?.MARKET_CACHE;
  if (!kv) return undefined;
  try {
    const raw = await kv.get(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return parsed?.data;
  } catch {
    return undefined;
  }
}

// Serve an aggregate route from KV when warm, else fall back to its live provider
// call (cold KV / local dev). `live` is a zero-arg async producing the same shape.
async function served(env, key, live) {
  const cached = await kvGet(env, key);
  return cached !== undefined ? cached : await live();
}

// No response-level caching here: caching the whole endpoint result locks in
// any partial (a compute that hit a Kalshi 429 on some tickers would cache the
// half-null result for the TTL). Caching is done at the upstream-subrequest
// level instead (success-only) in _providers.js, so partials self-heal.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\//, "").replace(/\/+$/, "");
  const state = String(url.searchParams.get("state") || "").toUpperCase();

  // Per-state routes read their aggregate KV key ({ [stateCode]: value }) and
  // index by state; a miss (cold KV, local dev, or a state the warmer doesn't
  // cover — e.g. House news) falls back to the single-state provider call, which
  // returns null for a genuinely unknown state -> 404.
  const fromAgg = async (aggKey, live) => {
    const agg = await kvGet(env, aggKey);
    return agg && agg[state] !== undefined ? agg[state] : await live();
  };

  try {
    switch (route) {
      case "control":
        return json(await served(env, "control", getControl), {
          cache: "s-maxage=60, stale-while-revalidate=300",
        });

      case "control-history":
        return json(await served(env, "control-history", getControlHistory), {
          cache: "s-maxage=300, stale-while-revalidate=900",
        });

      case "polls":
        return json(await served(env, "polls", getMacroPolls), {
          cache: "s-maxage=1800, stale-while-revalidate=3600",
        });

      case "house-races":
        return json(await served(env, "house-races", getAllHouseRaces), {
          cache: "s-maxage=300, stale-while-revalidate=600",
        });

      case "race-polls": {
        // No ?state= returns every state in one shot; ?state=GA returns just that one.
        if (!state) {
          return json(await served(env, "race-polls", getAllRacePolls), {
            cache: "s-maxage=1800, stale-while-revalidate=3600",
          });
        }
        const data = await fromAgg("race-polls", () => getRacePolls(state));
        return data
          ? json(data, { cache: "s-maxage=1800, stale-while-revalidate=3600" })
          : unknownState(state);
      }

      case "race": {
        if (!state) return missingState();
        const data = await fromAgg("races", () => getRace(state));
        return data
          ? json(data, { cache: "s-maxage=60, stale-while-revalidate=300" })
          : unknownState(state);
      }

      case "history": {
        if (!state) return missingState();
        const data = await fromAgg("histories", () => getRaceHistory(state));
        return data
          ? json(data, { cache: "s-maxage=300, stale-while-revalidate=900" })
          : unknownState(state);
      }

      case "race-news": {
        if (!state) return missingState();
        const data = await fromAgg("news", () => getRaceNews(state, env.NEWS_API_KEY));
        return data
          ? json(data, { cache: "s-maxage=1800, stale-while-revalidate=3600" })
          : unknownState(state);
      }

      default:
        return json({ error: `unknown endpoint /api/${route}` }, { status: 404 });
    }
  } catch (e) {
    return json({ error: String(e?.message || e) }, { status: 500 });
  }
}
