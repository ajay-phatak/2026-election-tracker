import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
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
import { fetchRaceOdds, fetchRaceHistory, sourceHasData } from "../lib/api";
import OverlapBar, { overlapInfo } from "./OverlapBar";
import { formatUpdated } from "../lib/format";

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

// ---- historical odds chart ---------------------------------------------

function formatTs(t) {
  return new Date(t * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function HistoryTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-ops-border bg-ops-panel px-3 py-2 text-xs shadow-lg tabular">
      <div className="mb-1 font-semibold text-ops-text">
        {new Date(label * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
      </div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey === "dem" ? "Dem" : "Rep"}: {p.value}%
        </div>
      ))}
    </div>
  );
}

// Measure the container ourselves (ResizeObserver) and feed recharts an explicit
// pixel width. Avoids ResponsiveContainer's flaky 0-width measurement when the
// chart mounts inside the off-screen slide-in drawer.
function useElementWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.getBoundingClientRect().width);
    measure(); // synchronous initial measurement (post-layout, pre-paint)
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

function HistoryChart({ data }) {
  const [ref, width] = useElementWidth();
  return (
    <div ref={ref} className="h-56 w-full">
      {width > 0 && (
        <LineChart width={width} height={224} data={data} margin={{ top: 5, right: 10, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="#1f2738" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={formatTs}
            tick={{ fill: "#8a97ac", fontSize: 11 }}
            stroke="#1f2738"
            minTickGap={48}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#8a97ac", fontSize: 11 }}
            stroke="#1f2738"
            tickFormatter={(v) => `${v}%`}
            width={40}
          />
          <Tooltip content={<HistoryTooltip />} />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: "#8a97ac" }}
            formatter={(value) => (value === "dem" ? "Democrat" : "Republican")}
          />
          <Line type="monotone" dataKey="dem" stroke={DEM} strokeWidth={2} dot={false} connectNulls />
          <Line type="monotone" dataKey="rep" stroke={REP} strokeWidth={2} dot={false} connectNulls />
        </LineChart>
      )}
    </div>
  );
}

// ---- current odds card (click to expand history) -----------------------

function ProviderOdds({ source, expanded, onToggle }) {
  const has = sourceHasData(source);
  const band = has ? overlapInfo(source.demYes, source.repYes) : null;
  const Tag = has ? "button" : "div";
  return (
    <Tag
      type={has ? "button" : undefined}
      onClick={has ? onToggle : undefined}
      aria-expanded={has ? expanded : undefined}
      className={`flex-1 rounded-lg border p-3 text-left transition-colors ${
        expanded ? "border-accent bg-ops-panel-2" : "border-ops-border bg-ops-panel-2/60"
      } ${has ? "cursor-pointer hover:border-accent/60" : ""}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ops-muted">
          {source.label}
        </span>
        {band && (
          <span className="text-[10px] font-medium" style={{ color: band.color }}>
            {band.text}
          </span>
        )}
      </div>
      {has ? (
        <>
          <div className="mb-2 flex items-baseline justify-between tabular">
            <span>
              <span className="text-2xl font-bold" style={{ color: DEM }}>
                {source.demYes}%
              </span>
              <span className="ml-1 text-[11px] text-ops-muted">Dem</span>
            </span>
            <span>
              <span className="text-lg font-bold" style={{ color: REP }}>
                {source.repYes}%
              </span>
              <span className="ml-1 text-[11px] text-ops-muted">Rep</span>
            </span>
          </div>
          <OverlapBar demYes={source.demYes} repYes={source.repYes} />
          <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              <path d="M2 3.5L5 6.5l3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {expanded ? "Hide history" : "View history"}
          </div>
        </>
      ) : (
        <div className="py-4 text-center text-xs text-ops-muted">No data yet</div>
      )}
    </Tag>
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

  // Live betting odds + historical series for the selected race.
  const [odds, setOdds] = useState(null);
  const [oddsStatus, setOddsStatus] = useState("loading"); // loading | ok | error
  const [history, setHistory] = useState(null);
  const [historyStatus, setHistoryStatus] = useState("loading");
  const [expandedSource, setExpandedSource] = useState(null);

  useEffect(() => {
    if (!activeCode) return;
    let alive = true;
    setOddsStatus("loading");
    setOdds(null);
    setHistoryStatus("loading");
    setHistory(null);
    setExpandedSource(null);
    fetchRaceOdds(activeCode)
      .then((d) => alive && (setOdds(d), setOddsStatus("ok")))
      .catch(() => alive && setOddsStatus("error"));
    fetchRaceHistory(activeCode)
      .then((d) => alive && (setHistory(d), setHistoryStatus("ok")))
      .catch(() => alive && setHistoryStatus("error"));
    return () => {
      alive = false;
    };
  }, [activeCode]);

  const race = activeCode ? getRaceByStateCode(activeCode) : null;
  const category = race ? CATEGORIES[race.category] : null;
  const oddsSources = odds?.sources || [];
  const anyOdds = oddsSources.some(sourceHasData);
  const oddsUpdated = oddsSources.find(sourceHasData)?.lastUpdated;
  const expandedHistory = expandedSource
    ? (history?.sources || []).find((s) => s.id === expandedSource)
    : null;
  const expandedLabel = oddsSources.find((s) => s.id === expandedSource)?.label;

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

            {/* Betting Odds — current, two-sided; click a provider for its history */}
            <Section title="Betting Odds — Win Probability">
              {oddsStatus === "loading" && (
                <div className="flex gap-3">
                  <div className="h-28 flex-1 animate-pulse rounded-lg bg-ops-panel-2/60" />
                  <div className="h-28 flex-1 animate-pulse rounded-lg bg-ops-panel-2/60" />
                </div>
              )}
              {oddsStatus === "error" && (
                <div className="rounded-lg border border-dashed border-ops-border bg-ops-panel-2/50 px-4 py-6 text-center text-sm text-ops-muted">
                  Couldn’t load market odds.
                </div>
              )}
              {oddsStatus === "ok" &&
                (anyOdds ? (
                  <>
                    <div className="flex items-stretch gap-3">
                      {oddsSources.map((s) => (
                        <ProviderOdds
                          key={s.id}
                          source={s}
                          expanded={expandedSource === s.id}
                          onToggle={() =>
                            setExpandedSource((cur) => (cur === s.id ? null : s.id))
                          }
                        />
                      ))}
                    </div>

                    {/* Expanded historical chart */}
                    {expandedSource && (
                      <div className="mt-3 rounded-lg border border-ops-border bg-ops-panel-2/40 p-3">
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ops-muted">
                          {expandedLabel} · win probability over time
                        </div>
                        {historyStatus === "loading" && (
                          <div className="h-56 animate-pulse rounded bg-ops-panel-2/60" />
                        )}
                        {historyStatus === "error" && (
                          <div className="py-8 text-center text-xs text-ops-muted">
                            Couldn’t load history.
                          </div>
                        )}
                        {historyStatus === "ok" &&
                          (expandedHistory?.hasData ? (
                            <HistoryChart data={expandedHistory.points} />
                          ) : (
                            <div className="py-8 text-center text-xs text-ops-muted">
                              No history yet
                            </div>
                          ))}
                      </div>
                    )}

                    {oddsUpdated && (
                      <p className="mt-2 text-[10px] uppercase tracking-wide text-ops-muted/70">
                        Updated {formatUpdated(oddsUpdated)}
                      </p>
                    )}
                  </>
                ) : (
                  <EmptyNote />
                ))}
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
