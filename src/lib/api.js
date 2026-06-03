// Client-side helpers that hit our serverless proxy (/api/*), which normalizes
// Kalshi + Polymarket into { sources: [{ id, label, demYes, repYes, lastUpdated }] }.

export async function fetchControl() {
  const r = await fetch("/api/control");
  if (!r.ok) throw new Error(`control ${r.status}`);
  return r.json();
}

export async function fetchRaceOdds(stateCode) {
  const r = await fetch(`/api/race?state=${encodeURIComponent(stateCode)}`);
  if (!r.ok) throw new Error(`race ${r.status}`);
  return r.json();
}

// Historical win-probability time-series per provider: { sources: [{ id, label, points:[{t,dem,rep}], hasData }] }
export async function fetchRaceHistory(stateCode) {
  const r = await fetch(`/api/history?state=${encodeURIComponent(stateCode)}`);
  if (!r.ok) throw new Error(`history ${r.status}`);
  return r.json();
}

// True when a normalized source actually carries odds.
export function sourceHasData(s) {
  return Boolean(s && s.demYes != null && s.repYes != null);
}
