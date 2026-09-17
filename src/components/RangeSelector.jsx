// Range selector shared by POLLING history charts (macro poll trends + the
// race drawer's polling average) and MARKET (betting odds) history charts
// (control-market panels + the race drawer's odds history).

export const POLL_RANGES = [
  { id: "all", label: "All", days: null },
  { id: "90d", label: "90D", days: 90 },
  { id: "30d", label: "30D", days: 30 },
];

// Same { id, label, days } shape as POLL_RANGES, plus 7D/24H — market history
// supports finer windows because the server fetches sub-daily candles for
// them (see MARKET_RANGES in api/_providers.js), unlike polls which are at
// most daily. (Same fast-refresh tradeoff as POLL_RANGES above — this file
// already mixes a component with plain exports.)
// eslint-disable-next-line react-refresh/only-export-components
export const MARKET_RANGES = [
  { id: "all", label: "All", days: null },
  { id: "90d", label: "90D", days: 90 },
  { id: "30d", label: "30D", days: 30 },
  { id: "7d", label: "7D", days: 7 },
  { id: "24h", label: "24H", days: 1 },
];

// Slice `data` (rows sorted oldest -> newest, each { t: unixSeconds, ... }) to the
// trailing `days` window. `days` null/0 returns the data unchanged ("All").
//
// Deliberately anchored to the NEWEST POINT IN THE SERIES rather than Date.now():
// per-race polling trends can go stale (most recent poll weeks old) while a
// range selector is still open, and slicing against "now" would silently blank
// the chart instead of showing the last real data.
export function sliceRange(data, days) {
  if (!days || !data || data.length < 2) return data;
  const newest = data[data.length - 1].t;
  const cutoff = newest - days * 86400;
  return data.filter((p) => p.t >= cutoff);
}

// Small segmented pill control, styled to match the SourceSwitcher in
// MacroMetrics.jsx. When `data` is passed, ranges that would leave fewer than
// 2 points (a one-dot chart is useless) are disabled rather than hidden —
// "All" is always selectable since it never trims anything away. Market
// callers deliberately don't pass `data`: the server already narrows the
// payload to the requested window, so there's nothing to test client-side —
// an empty range surfaces through the caller's existing "No history yet"
// state instead.
export default function RangeSelector({ value, onChange, ranges = POLL_RANGES, data }) {
  return (
    <div
      role="group"
      aria-label="Chart range"
      className="flex items-center gap-0.5 rounded-full border border-ops-border bg-ops-panel-2/60 px-1 py-0.5"
    >
      {ranges.map((r) => {
        const disabled = r.days != null && data && sliceRange(data, r.days).length < 2;
        const active = value === r.id;
        return (
          <button
            key={r.id}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            title={disabled ? "Not enough polling in this window" : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onChange(r.id);
            }}
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
              disabled
                ? "cursor-not-allowed text-ops-muted/40"
                : active
                  ? "bg-accent/15 text-accent"
                  : "text-ops-muted hover:text-ops-text"
            }`}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
