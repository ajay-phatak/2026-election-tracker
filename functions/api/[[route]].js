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

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\//, "").replace(/\/+$/, "");
  const state = String(url.searchParams.get("state") || "").toUpperCase();

  try {
    switch (route) {
      case "control":
        return json(await getControl(), { cache: "s-maxage=60, stale-while-revalidate=300" });

      case "control-history":
        return json(await getControlHistory(), { cache: "s-maxage=300, stale-while-revalidate=900" });

      case "polls":
        return json(await getMacroPolls(), { cache: "s-maxage=1800, stale-while-revalidate=3600" });

      case "house-races":
        return json(await getAllHouseRaces(), { cache: "s-maxage=300, stale-while-revalidate=600" });

      case "race-polls": {
        // No ?state= returns every state in one shot; ?state=GA returns just that one.
        if (!state) {
          return json(await getAllRacePolls(), { cache: "s-maxage=1800, stale-while-revalidate=3600" });
        }
        const data = await getRacePolls(state);
        return data
          ? json(data, { cache: "s-maxage=1800, stale-while-revalidate=3600" })
          : unknownState(state);
      }

      case "race": {
        if (!state) return missingState();
        const data = await getRace(state);
        return data
          ? json(data, { cache: "s-maxage=60, stale-while-revalidate=300" })
          : unknownState(state);
      }

      case "history": {
        if (!state) return missingState();
        const data = await getRaceHistory(state);
        return data
          ? json(data, { cache: "s-maxage=300, stale-while-revalidate=900" })
          : unknownState(state);
      }

      case "race-news": {
        if (!state) return missingState();
        const data = await getRaceNews(state, env.NEWS_API_KEY);
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
