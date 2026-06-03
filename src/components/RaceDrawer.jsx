import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { CATEGORIES } from "../config/races.config";
import { getRaceByStateCode } from "../lib/races";
import { pollingByState } from "../mocks/polling";
import { oddsByState } from "../mocks/bettingOdds";
import { formatShortDate, formatUpdated } from "../lib/format";

const DEM = "#2563eb";
const REP = "#dc2626";
const EMPTY_MSG = "No data yet — check back closer to November";

function PartyBadge({ party }) {
  const isDem = party === "D";
  const color = isDem ? DEM : REP;
  return (
    <span
      className="rounded px-2 py-0.5 text-xs font-bold"
      style={{ color, backgroundColor: `${color}1f` }}
    >
      {isDem ? "Democrat" : "Republican"}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <section className="border-t border-ops-border px-5 py-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ops-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

function EmptyNote() {
  return (
    <div className="rounded-lg border border-dashed border-ops-border bg-ops-panel-2/50 px-4 py-6 text-center text-sm text-ops-muted">
      {EMPTY_MSG}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-ops-border bg-ops-panel px-3 py-2 text-xs shadow-lg tabular">
      <div className="mb-1 font-semibold text-ops-text">{formatShortDate(label)}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey === "dem" ? "Dem" : "Rep"}: {p.value}%
        </div>
      ))}
    </div>
  );
}

function PollingChart({ data }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#1f2738" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            tick={{ fill: "#8a97ac", fontSize: 11 }}
            stroke="#1f2738"
          />
          <YAxis
            domain={[40, 55]}
            tick={{ fill: "#8a97ac", fontSize: 11 }}
            stroke="#1f2738"
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: "#8a97ac" }}
            formatter={(value) => (value === "dem" ? "Democrat" : "Republican")}
          />
          <Line
            type="monotone"
            dataKey="dem"
            stroke={DEM}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="rep"
            stroke={REP}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function OddsCard({ source, demWinProb }) {
  const repWinProb = 100 - demWinProb;
  return (
    <div className="flex-1 rounded-lg border border-ops-border bg-ops-panel-2/60 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ops-muted">
        {source}
      </div>
      <div className="tabular">
        <span className="text-2xl font-bold" style={{ color: DEM }}>
          {demWinProb}%
        </span>
        <span className="ml-1 text-xs text-ops-muted">Dem win</span>
      </div>
      <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-ops-border">
        <div style={{ width: `${demWinProb}%`, backgroundColor: DEM }} />
        <div style={{ width: `${repWinProb}%`, backgroundColor: REP }} />
      </div>
    </div>
  );
}

export default function RaceDrawer({ stateCode, onClose }) {
  const open = Boolean(stateCode);
  // Keep the last selected code so content doesn't blank out during the slide-out.
  const [activeCode, setActiveCode] = useState(stateCode);
  useEffect(() => {
    if (stateCode) setActiveCode(stateCode);
  }, [stateCode]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const race = activeCode ? getRaceByStateCode(activeCode) : null;
  const polls = activeCode ? pollingByState[activeCode] : null;
  const odds = activeCode ? oddsByState[activeCode] : null;
  const category = race ? CATEGORIES[race.category] : null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={`drawer-scroll fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-ops-border bg-ops-panel shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {race && (
          <>
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-ops-border bg-ops-panel/95 px-5 py-4 backdrop-blur">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-ops-text">{race.state}</h2>
                  <span
                    className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ color: category.color, backgroundColor: `${category.color}24` }}
                  >
                    {category.label}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-ops-muted">{race.incumbent}</span>
                  <PartyBadge party={race.party} />
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 rounded-md p-1.5 text-ops-muted transition-colors hover:bg-ops-panel-2 hover:text-ops-text"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Polling */}
            <Section title="Polling Average — D vs R">
              {polls?.length ? <PollingChart data={polls} /> : <EmptyNote />}
            </Section>

            {/* Betting Odds */}
            <Section title="Betting Odds — Dem Win Probability">
              {odds ? (
                <>
                  <div className="flex gap-3">
                    <OddsCard source="Kalshi" demWinProb={odds.kalshi.demWinProb} />
                    <OddsCard source="Polymarket" demWinProb={odds.polymarket.demWinProb} />
                  </div>
                  <p className="mt-2 text-[10px] uppercase tracking-wide text-ops-muted/70">
                    Updated {formatUpdated(odds.lastUpdated)}
                  </p>
                </>
              ) : (
                <EmptyNote />
              )}
            </Section>

            {/* Notes — hidden entirely when empty */}
            {race.notes?.trim() && (
              <Section title="Notes">
                <div
                  className="rounded-lg border-l-4 bg-ops-panel-2/60 px-4 py-3 text-sm text-ops-text"
                  style={{ borderColor: "#2563eb" }}
                >
                  {race.notes}
                </div>
              </Section>
            )}
          </>
        )}
      </aside>
    </>
  );
}
