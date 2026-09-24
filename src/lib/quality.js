// Shared, strict contracts: no coercion of null/string/NaN into real odds.
export const validPct = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 100;
export const validOdds = (s) => Boolean(s && validPct(s.demYes) && validPct(s.repYes));
export function freshness(iso, now = Date.now(), maxAgeMs = 30 * 60 * 1000) {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t) || t > now + 60000) return 'unknown';
  return now - t > maxAgeMs ? 'stale' : 'recent';
}
export function conditionalSeats(base, tossups, majority = 218) {
  const needed = Math.max(0, majority - base);
  return needed > tossups ? `${needed} needed; ${needed - tossups} must come from other buckets` : `${needed} of ${tossups} toss-ups needed`;
}
export function bucketFor(entry) {
  const s = entry?.sources?.find(validOdds);
  if (!s) return null;
  const spread = s.demYes - s.repYes;
  const abs = Math.abs(spread);
  if (abs < 15) return 'tossup';
  return `${abs < 35 ? 'lean' : abs < 55 ? 'likely' : 'safe'}${spread > 0 ? 'D' : 'R'}`;
}
// Use actual UTC daily observations, never a nearest neighbor across missing days.
// Compare latest history to history, NOT a current quote to an old candle.
export function historicalDelta(points, days, key = 'dem', now = Date.now() / 1000) {
  const byDay = new Map();
  for (const p of [...(points || [])].sort((a,b) => a.t-b.t)) {
    if (Number.isFinite(p.t) && p.t <= now && validPct(p[key])) byDay.set(Math.floor(p.t / 86400), p);
  }
  const latest = [...byDay.values()].at(-1);
  if (!latest) return { reason: 'History unavailable' };
  const prior = byDay.get(Math.floor(latest.t / 86400) - days);
  if (!prior) return { reason: `Missing ${days}-day comparison`, latest: latest.t };
  return { delta: Math.round((latest[key] - prior[key]) * 10) / 10, from: prior.t, to: latest.t, stale: now - latest.t > 2 * 86400 };
}
export function markStale(value) {
  if (Array.isArray(value)) return value.map(markStale);
  if (!value || typeof value !== 'object') return value;
  return { ...Object.fromEntries(Object.entries(value).map(([k,v]) => [k, markStale(v)])), stale: true };
}
// Preserve last-good leaves on partial failures without rewriting their timestamps.
export function preserveGood(fresh, old) {
  if (Array.isArray(fresh)) return fresh.map((v, i) => preserveGood(v, v?.id ? old?.find?.(x => x?.id === v.id) : old?.[i]));
  if (fresh == null && old && typeof old === 'object') return markStale(old);
  if (!fresh || typeof fresh !== 'object') return fresh;
  if ('demYes' in fresh && !validOdds(fresh) && validOdds(old)) return { ...old, stale: true, status: 'stale', error: 'Refresh unavailable; last successful retrieval retained' };
  return Object.fromEntries(Object.entries(fresh).map(([k,v]) => [k, preserveGood(v, old?.[k])]));
}
