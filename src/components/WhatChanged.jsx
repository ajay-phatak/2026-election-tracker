import { useEffect, useState } from 'react';
import { fetchControlHistory, sourceHasData } from '../lib/api';
import { formatUpdated } from '../lib/format';
import { historicalDelta } from '../lib/quality';
const date = t => new Date(t * 1000).toISOString().slice(0, 10);
function Move({ points, days }) {
  const d = historicalDelta(points, days);
  return <div className="text-xs text-ops-muted">{days === 1 ? 'Day' : 'Week'}: {d.delta == null ? `${d.reason}${d.latest ? ` · latest ${date(d.latest)} UTC` : ""}` : <><b className="text-ops-text">{d.delta > 0 ? '+' : ''}{d.delta.toFixed(1)} pp DEM</b> · {date(d.from)} → {date(d.to)} UTC{d.stale ? ' · stale history' : ''}</>}</div>;
}
export default function WhatChanged({ control }) {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    fetchControlHistory().then(d => alive && setHistory(d)).catch(() => alive && setError(true));
    return () => { alive = false; };
  }, []);
  return <section className="rounded-xl border border-ops-border bg-ops-panel/60 p-4">
    <h2 className="text-sm font-semibold text-ops-text">What changed · source comparison</h2>
    <p className="mt-1 text-xs text-ops-muted">Separate market-implied probabilities, not a combined forecast. Day/week moves compare the latest available daily history with the exact prior UTC day/week. Missing days are not interpolated; dates are UTC day buckets, not quote times. Historical endpoints may lag current prices.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{['senate', 'house'].flatMap(chamber => ['polymarket','kalshi'].map(id => {
      const s = control?.[chamber]?.sources?.find(x => x.id === id);
      const h = history?.[chamber]?.sources?.find(x => x.id === id);
      return <div key={`${chamber}-${id}`} className="rounded-lg border border-ops-border p-3">
        <h3 className="text-xs font-semibold capitalize">{chamber} · {id === 'polymarket' ? 'Polymarket' : 'Kalshi'}</h3>
        <p className="my-2 text-xs">{sourceHasData(s) ? `DEM ${s.demYes}% · GOP ${s.repYes}%` : 'Current prices unavailable'}</p>
        <p className="mb-2 text-[10px] text-ops-muted">{s?.stale ? 'Stale · ' : ''}Retrieved {formatUpdated(s?.retrievedAt)} · {s?.observationAt ? `Candle ${formatUpdated(s.observationAt)}` : 'Source change time unknown'}</p>
        {h?.stale && <p className="text-xs text-ops-muted">Stale · last-good history retained</p>}
        {!history && !error ? <p className="text-xs">Loading history…</p> : error ? <p className="text-xs">History request failed · retry from the dashboard</p> : <><Move points={h?.points} days={1}/><Move points={h?.points} days={7}/></>}
      </div>;
    }))}</div>
    <p className="mt-2 text-xs text-ops-muted">Independent Yes prices can sum above or below 100%. Market rules, liquidity and observation times differ. Price changes alone do not establish why a race moved.</p>
  </section>;
}
