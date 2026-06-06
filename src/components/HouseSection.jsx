import { useEffect, useMemo, useState } from "react";
import { WATCHED_RACES, RATINGS, HOUSE_OUTLOOK } from "../config/races.config";
import { fetchHouseRaces, sourceHasData } from "../lib/api";

const DEM = "#2563eb";
const REP = "#dc2626";

// Most-competitive first when sorting by rating.
const RATING_RANK = { tossup: 0, leanD: 1, leanR: 1, likelyD: 2, likelyR: 2, safeD: 3, safeR: 3 };

// Pull the leading side from a district's market sources (Polymarket only for House).
function marketLead(entry) {
  const src = entry?.sources?.find(sourceHasData);
  if (!src) return null;
  const demLeads = src.demYes >= src.repYes;
  return { party: demLeads ? "D" : "R", pct: demLeads ? src.demYes : src.repYes };
}

function RatingBadge({ rating }) {
  const r = RATINGS[rating];
  if (!r) return null;
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ color: r.color, backgroundColor: `${r.color}24` }}
    >
      {r.label}
    </span>
  );
}

// ---- Seats-to-218 balance bar ------------------------------------------

function SeatsBar() {
  const { current, total, majority } = HOUSE_OUTLOOK;
  const pct = (n) => `${(n / total) * 100}%`;
  const needed = Math.max(0, majority - current.dem);

  return (
    <div>
      <div className="mb-2 flex items-end justify-between text-xs">
        <span className="font-semibold" style={{ color: DEM }}>
          {current.dem} <span className="text-ops-muted">DEM</span>
        </span>
        <span className="text-[10px] uppercase tracking-wide text-ops-muted">
          {majority} for majority
        </span>
        <span className="font-semibold" style={{ color: REP }}>
          <span className="text-ops-muted">GOP</span> {current.rep}
        </span>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-ops-border">
        <div className="absolute left-0 top-0 h-full" style={{ width: pct(current.dem), backgroundColor: DEM }} />
        <div className="absolute right-0 top-0 h-full" style={{ width: pct(current.rep), backgroundColor: REP }} />
        {/* 218-seat majority line */}
        <div className="absolute top-[-2px] h-[calc(100%+4px)] w-px bg-ops-text/80" style={{ left: pct(majority) }} />
      </div>

      <p className="mt-2 text-xs text-ops-muted">
        Democrats need a net{" "}
        <span className="font-semibold text-ops-text">+{needed} seats</span> to take the House
        {current.vacant ? ` · ${current.vacant} vacant` : ""}.
      </p>
    </div>
  );
}

// ---- Ratings rollup (path to 218) --------------------------------------

function RatingsRollup() {
  const { ratings, total, majority } = HOUSE_OUTLOOK;
  const order = Object.keys(RATINGS); // safeD ... safeR
  const demBase = ratings.safeD + ratings.likelyD + ratings.leanD;
  const repBase = ratings.safeR + ratings.likelyR + ratings.leanR;
  const demNeed = Math.max(0, majority - demBase);
  const repNeed = Math.max(0, majority - repBase);

  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ops-muted">
        All 435 seats by rating
      </div>
      <div className="relative flex h-3 w-full overflow-hidden rounded-full bg-ops-border">
        {order.map((key) => (
          <div
            key={key}
            title={`${RATINGS[key].label}: ${ratings[key]}`}
            style={{ width: `${(ratings[key] / total) * 100}%`, backgroundColor: RATINGS[key].color }}
          />
        ))}
        <div className="absolute top-[-2px] h-[calc(100%+4px)] w-px bg-ops-text/80" style={{ left: `${(majority / total) * 100}%` }} />
      </div>
      <p className="mt-2 text-xs text-ops-muted">
        Safe/likely/lean: <span className="font-semibold" style={{ color: DEM }}>{demBase} D</span>{" "}
        · <span className="font-semibold" style={{ color: REP }}>{repBase} R</span>. To reach 218,
        Democrats need <span className="font-semibold text-ops-text">{demNeed}</span> of{" "}
        {ratings.tossup} toss-ups (Republicans {repNeed}).
      </p>
    </div>
  );
}

// ---- Watchlist table ---------------------------------------------------

function Watchlist({ odds, onSelectRace }) {
  const [sort, setSort] = useState("rating"); // rating | district | market
  const districts = WATCHED_RACES.house;

  const rows = useMemo(() => {
    const withLead = districts.map((d) => ({ ...d, lead: marketLead(odds?.[d.code]) }));
    const cmp = {
      district: (a, b) => a.code.localeCompare(b.code),
      rating: (a, b) => (RATING_RANK[a.rating] - RATING_RANK[b.rating]) || a.code.localeCompare(b.code),
      market: (a, b) => (b.lead?.pct ?? -1) - (a.lead?.pct ?? -1),
    }[sort];
    return [...withLead].sort(cmp);
  }, [districts, odds, sort]);

  // Plain render helper (not a component) — sortable column header.
  const sortHeader = (id, label, className = "") => (
    <th className={`pb-2 font-semibold ${className}`}>
      <button
        type="button"
        onClick={() => setSort(id)}
        className={`uppercase tracking-wide transition-colors hover:text-ops-text ${
          sort === id ? "text-ops-text" : "text-ops-muted"
        }`}
      >
        {label}
      </button>
    </th>
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-ops-muted">
          Competitive districts ({districts.length})
        </div>
        <span className="text-[10px] uppercase tracking-wide text-ops-muted/60">click a row for detail</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm [&_td]:pr-4 [&_th]:pr-4">
          <thead>
            <tr className="border-b border-ops-border text-[10px]">
              {sortHeader("district", "District")}
              <th className="pb-2 font-semibold text-[10px] uppercase tracking-wide text-ops-muted">Incumbent</th>
              {sortHeader("rating", "Rating")}
              {sortHeader("market", "Market", "text-right")}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr
                key={d.code}
                onClick={() => onSelectRace(d.code)}
                className="cursor-pointer border-b border-ops-border/50 transition-colors hover:bg-ops-panel-2/60"
              >
                <td className="py-2 font-semibold text-ops-text">{d.district}</td>
                <td className="py-2 text-ops-muted">
                  {d.incumbent}{" "}
                  <span
                    className="ml-0.5 text-[10px] font-bold"
                    style={{ color: d.party === "D" ? DEM : REP }}
                  >
                    ({d.party})
                  </span>
                </td>
                <td className="py-2"><RatingBadge rating={d.rating} /></td>
                <td className="py-2 text-right tabular">
                  {d.lead ? (
                    <span className="font-semibold" style={{ color: d.lead.party === "D" ? DEM : REP }}>
                      {d.lead.party} {d.lead.pct}%
                    </span>
                  ) : (
                    <span className="text-ops-muted/50">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] uppercase tracking-wide text-ops-muted/60">
        Ratings hand-curated · market odds via Polymarket where available
      </p>
    </div>
  );
}

// ---- Section -----------------------------------------------------------

export default function HouseSection({ onSelectRace }) {
  const [odds, setOdds] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchHouseRaces()
      .then((d) => alive && setOdds(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-ops-border bg-ops-panel/40 p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ops-text">
          House — Battle for the Majority
        </h2>
        <p className="text-xs text-ops-muted">
          435 seats · 218 to control · watchlist of the most competitive districts
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SeatsBar />
        <RatingsRollup />
      </div>

      <div className="mt-6">
        <Watchlist odds={odds} onSelectRace={onSelectRace} />
      </div>
    </section>
  );
}
