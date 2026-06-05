// Recent-news proxy via Google News RSS — free, no API key. Framework-agnostic
// (plain async + global fetch) so it runs both as a Vercel function and under the
// Vite dev middleware. Fetched server-side because the browser can't (CORS) and
// because the response is RSS XML we parse here.
//
// Result shape: { stateCode, articles: [{ title, link, source, publishedAt }], lastUpdated }

import { WATCHED_RACES } from "../src/config/races.config.js";

const GNEWS = "https://news.google.com/rss/search";
// Google 403s/empties some UA-less requests; match the convention used elsewhere.
const UA = "2026-election-tracker/1.0 (dashboard)";

const MAX_ARTICLES = 6;

// Decode the handful of XML/HTML entities Google News emits, and strip CDATA.
function decode(s) {
  if (!s) return "";
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m ? decode(m[1]) : "";
}

// Google appends " - <Source>" to item titles; drop it when it matches the source.
function stripSourceSuffix(title, source) {
  if (source && title.endsWith(` - ${source}`)) {
    return title.slice(0, -(source.length + 3)).trim();
  }
  return title;
}

function parseRss(xml, stateName) {
  const state = (stateName || "").toLowerCase();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  return items
    .map(([, block]) => {
      const source = tag(block, "source");
      const title = stripSourceSuffix(tag(block, "title"), source);
      const link = tag(block, "link");
      const pub = tag(block, "pubDate");
      const ts = pub ? new Date(pub).getTime() : NaN;
      return {
        title,
        link,
        source,
        publishedAt: Number.isNaN(ts) ? null : new Date(ts).toISOString(),
        // Google occasionally relaxes the quoted phrase and leaks generic
        // cross-state "Latest Polls" pages; prioritize headlines naming the state.
        rel: state && title.toLowerCase().includes(state) ? 1 : 0,
      };
    })
    .filter((a) => a.title && a.link)
    .sort((a, b) => b.rel - a.rel || (b.publishedAt || "").localeCompare(a.publishedAt || ""))
    .slice(0, MAX_ARTICLES)
    .map(({ rel, ...a }) => a);
}

export async function getRaceNews(stateCode) {
  const race = WATCHED_RACES.senate.find((r) => r.stateCode === stateCode);
  if (!race) return null;

  const empty = { stateCode, articles: [], lastUpdated: null };
  try {
    // Quote the "<State> Senate race" phrase so Google enforces the state and the
    // federal race (avoids generic cross-state "Latest Polls" and state-legislature noise).
    const query = `"${race.state} Senate race" 2026`;
    const url = `${GNEWS}?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (!r.ok) return empty;
    const articles = parseRss(await r.text(), race.state);
    return {
      stateCode,
      articles,
      lastUpdated: articles.length ? new Date().toISOString() : null,
    };
  } catch {
    return empty;
  }
}
