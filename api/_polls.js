// VoteHub polling proxy + normalization. Framework-agnostic (plain async + global
// fetch) so it runs both as a Vercel function and under the Vite dev middleware.
//
// We compute simple trailing averages ourselves (VoteHub serves raw polls; its
// /averages endpoint 500s). Each result also carries a rolling-average `trend`
// series for the click-to-expand history charts.

import { WATCHED_RACES } from "../src/config/races.config.js";

const VOTEHUB = "https://api.votehub.com/polls";
const UA = "2026-election-tracker/1.0 (dashboard)";

// VoteHub honors ?poll_type= server-side, so fetch only the slice we need
// (us-senator is ~113 KB vs the full ~2.4 MB list).
async function getPolls(pollType) {
  const url = pollType ? `${VOTEHUB}?poll_type=${encodeURIComponent(pollType)}` : VOTEHUB;
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!r.ok) throw new Error(`votehub ${r.status}`);
  return r.json();
}

const tsOf = (p) => {
  const d = new Date(p.end_date);
  return Number.isNaN(d.getTime()) ? 0 : Math.floor(d.getTime() / 1000);
};

const round1 = (x) => Math.round(x * 10) / 10;
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

// One poll -> { left, right } averaged pct of the answers matching each side.
function pollSides(poll, isLeft, isRight) {
  const l = [];
  const r = [];
  for (const a of poll.answers || []) {
    const c = a.choice || "";
    const v = Number(a.pct);
    if (!Number.isFinite(v)) continue;
    if (isLeft(c)) l.push(v);
    else if (isRight(c)) r.push(v);
  }
  return { left: mean(l), right: mean(r) };
}

function points(polls, isLeft, isRight) {
  return polls
    .filter((p) => !p.internal)
    .map((p) => ({ t: tsOf(p), ...pollSides(p, isLeft, isRight) }))
    .filter((p) => p.t > 0 && (p.left != null || p.right != null))
    .sort((a, b) => a.t - b.t);
}

// Trailing average: polls within `windowDays`, falling back to the most recent `minN`.
function averageRecent(polls, isLeft, isRight, { windowDays = 90, minN = 5 } = {}) {
  const pts = points(polls, isLeft, isRight).sort((a, b) => b.t - a.t); // newest first
  if (!pts.length) return { left: null, right: null, n: 0, lastUpdated: null };
  const cutoff = Date.now() / 1000 - windowDays * 86400;
  let sel = pts.filter((p) => p.t >= cutoff);
  if (sel.length < minN) sel = pts.slice(0, minN);
  const side = (k) => {
    const m = mean(sel.map((p) => p[k]).filter((x) => x != null));
    return m == null ? null : round1(m);
  };
  return {
    left: side("left"),
    right: side("right"),
    n: sel.length,
    lastUpdated: new Date(pts[0].t * 1000).toISOString(),
  };
}

// Rolling trailing-window average, oldest -> newest, trimmed/downsampled for charts.
function rollingTrend(polls, isLeft, isRight, { windowDays = 30, maxDays = 540, maxPoints = 130 } = {}) {
  const pts = points(polls, isLeft, isRight);
  if (!pts.length) return [];
  const win = windowDays * 86400;
  let out = pts.map((cur) => {
    const w = pts.filter((p) => p.t <= cur.t && p.t >= cur.t - win);
    const side = (k) => {
      const m = mean(w.map((p) => p[k]).filter((x) => x != null));
      return m == null ? null : round1(m);
    };
    return { t: cur.t, left: side("left"), right: side("right") };
  });
  const newest = out[out.length - 1].t;
  out = out.filter((p) => p.t >= newest - maxDays * 86400);
  if (out.length > maxPoints) {
    const step = Math.ceil(out.length / maxPoints);
    out = out.filter((_, i) => i % step === 0 || i === out.length - 1);
  }
  return out;
}

const nameTrend = (trend, leftKey, rightKey) =>
  trend.map((p) => ({ t: p.t, [leftKey]: p.left, [rightKey]: p.right }));

// ---- matchers ----
const lc = (c) => (c || "").toLowerCase();
const gbDem = (c) => lc(c) === "dem" || lc(c).includes("democrat");
const gbRep = (c) => lc(c) === "rep" || lc(c).includes("republican");
const apAppr = (c) => lc(c).includes("approve") && !lc(c).includes("disapprove");
const apDis = (c) => lc(c).includes("disapprove");

// ---- public API ----
export async function getMacroPolls() {
  const [gb, apAll] = await Promise.all([getPolls("generic-ballot"), getPolls("approval")]);

  const gbAvg = averageRecent(gb, gbDem, gbRep, { windowDays: 45, minN: 5 });
  const gbTrend = nameTrend(rollingTrend(gb, gbDem, gbRep, { windowDays: 30 }), "dem", "rep");

  const ap = apAll.filter((p) => p.subject === "Donald Trump");
  const apAvg = averageRecent(ap, apAppr, apDis, { windowDays: 30, minN: 5 });
  const apTrend = nameTrend(rollingTrend(ap, apAppr, apDis, { windowDays: 21 }), "approve", "disapprove");

  return {
    genericBallot: { dem: gbAvg.left, rep: gbAvg.right, n: gbAvg.n, lastUpdated: gbAvg.lastUpdated, trend: gbTrend },
    approval: { approve: apAvg.left, disapprove: apAvg.right, n: apAvg.n, lastUpdated: apAvg.lastUpdated, trend: apTrend },
  };
}

// Compute one race's polling from an already-fetched poll list (no network).
function racePollsFor(race, all) {
  const polls = all.filter(
    (p) => p.poll_type === "us-senator" && p.subject === `2026 ${race.state}`
  );
  const demFrags = (race.pollParties?.dem || []).map(lc);
  const repFrags = (race.pollParties?.rep || []).map(lc);
  const isDem = (c) => lc(c) === "democrat" || demFrags.some((f) => lc(c).includes(f));
  const isRep = (c) => lc(c) === "republican" || repFrags.some((f) => lc(c).includes(f));

  const avg = averageRecent(polls, isDem, isRep, { windowDays: 120, minN: 4 });
  const trend = nameTrend(
    rollingTrend(polls, isDem, isRep, { windowDays: 45, maxDays: 730 }),
    "dem",
    "rep"
  );
  return {
    stateCode: race.stateCode,
    dem: avg.left,
    rep: avg.right,
    n: avg.n,
    lastUpdated: avg.lastUpdated,
    trend,
  };
}

export async function getRacePolls(stateCode) {
  const race = WATCHED_RACES.senate.find((r) => r.stateCode === stateCode);
  if (!race) return null;
  const all = await getPolls("us-senator");
  return racePollsFor(race, all);
}

// All watched races from a single (filtered) VoteHub fetch -> { GA: {...}, MI: {...}, ... }
export async function getAllRacePolls() {
  const all = await getPolls("us-senator");
  const out = {};
  for (const race of WATCHED_RACES.senate) out[race.stateCode] = racePollsFor(race, all);
  return out;
}
