// Recent-news proxy via the GNews API (https://gnews.io). Replaces the old Google
// News RSS source, which Google blocks from datacenter/Cloudflare egress IPs.
// Framework-agnostic (plain async + global fetch) so it runs both as a Cloudflare
// Pages Function and under the Vite dev middleware.
//
// The API key is passed in by the caller (env.NEWS_API_KEY on Workers,
// process.env.NEWS_API_KEY in local dev). With no key we degrade gracefully to an
// empty article list rather than erroring — the UI already handles empty news.
//
// Result shape: { stateCode, articles: [{ title, link, source, publishedAt }], lastUpdated }

import { WATCHED_RACES } from "../src/config/races.config.js";

const GNEWS = "https://gnews.io/api/v4/search";
const MAX_ARTICLES = 6;

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

// Build the GNews query + the relevance term (titles containing it rank first).
// Senate quotes "<State> Senate race"; House quotes the incumbent (or, for open
// seats, the "<State> <Nth> district" phrase).
// Keep queries to as few terms as possible. GNews ANDs space-separated terms and
// the free plan only returns the last 30 days, so each extra word shrinks the set
// toward empty (e.g. "Georgia Senate race 2026" -> ~0, while "Georgia Senate"
// returns hundreds). normalize() re-ranks state/name matches to the top, so the
// looser query stays relevant.
function newsConfig(race) {
  if (!race.district) {
    return { query: `${race.state} Senate`, rel: race.state };
  }
  const hasName = race.incumbent && !/open/i.test(race.incumbent);
  if (hasName) {
    const surname = race.incumbent.split(" ").pop();
    return { query: race.incumbent, rel: surname };
  }
  const num = Number(race.district.split("-")[1]);
  return { query: `${race.state} ${ordinal(num)} district`, rel: race.state };
}

// Map GNews's article shape to ours, ranking titles that name the relevance term
// first (GNews occasionally returns loosely-related results), then newest-first.
function normalize(articles, rel) {
  const term = (rel || "").toLowerCase();
  return (articles || [])
    .map((a) => ({
      title: a.title || "",
      link: a.url || "",
      source: a.source?.name || "",
      publishedAt: a.publishedAt || null,
      relScore: term && (a.title || "").toLowerCase().includes(term) ? 1 : 0,
    }))
    .filter((a) => a.title && a.link)
    .sort((a, b) => b.relScore - a.relScore || (b.publishedAt || "").localeCompare(a.publishedAt || ""))
    .slice(0, MAX_ARTICLES)
    .map(({ title, link, source, publishedAt }) => ({ title, link, source, publishedAt }));
}

export async function getRaceNews(code, apiKey) {
  const race = [...WATCHED_RACES.senate, ...(WATCHED_RACES.house || [])].find(
    (r) => (r.code ?? r.stateCode) === code
  );
  if (!race) return null;

  const empty = { stateCode: code, articles: [], lastUpdated: null };
  // No key configured -> degrade gracefully (local dev, or before the Pages env var is set).
  if (!apiKey) return empty;

  try {
    const { query, rel } = newsConfig(race);
    // Keep to params supported on the GNews free tier (q, lang, country, max).
    const url =
      `${GNEWS}?q=${encodeURIComponent(query)}` +
      `&lang=en&country=us&max=${MAX_ARTICLES}&apikey=${apiKey}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return empty;
    const data = await r.json();
    const articles = normalize(data.articles, rel);
    return {
      stateCode: code,
      articles,
      lastUpdated: articles.length ? new Date().toISOString() : null,
    };
  } catch {
    return empty;
  }
}
