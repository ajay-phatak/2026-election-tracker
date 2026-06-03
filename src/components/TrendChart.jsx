import { useLayoutEffect, useRef, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// Measure the container ourselves (ResizeObserver) and feed recharts an explicit
// pixel width. Avoids ResponsiveContainer's flaky 0-width measurement when a chart
// mounts inside an off-screen slide-in panel or a freshly-expanded section.
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

const fmtTs = (t) =>
  new Date(t * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const compactNum = (n) => {
  if (n == null) return "";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(Math.round(n));
};

// Auto-scale Y to the data: pad ~3pts beyond the min/max and snap to a multiple of
// 5 for clean ticks, clamped to [0, 100]. Keeps lines readable instead of squished.
const AUTO_DOMAIN = [
  (min) => Math.max(0, Math.floor((min - 3) / 5) * 5),
  (max) => Math.min(100, Math.ceil((max + 3) / 5) * 5),
];

function TrendTooltip({ active, payload, label, series, volumeKey }) {
  if (!active || !payload?.length) return null;
  const vol = volumeKey ? payload.find((p) => p.dataKey === volumeKey) : null;
  return (
    <div className="rounded-md border border-ops-border bg-ops-panel px-3 py-2 text-xs shadow-lg tabular">
      <div className="mb-1 font-semibold text-ops-text">
        {new Date(label * 1000).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>
      {payload
        .filter((p) => p.dataKey !== volumeKey)
        .map((p) => {
          const s = series.find((x) => x.key === p.dataKey);
          return (
            <div key={p.dataKey} style={{ color: p.color }}>
              {s?.label || p.dataKey}: {p.value}%
            </div>
          );
        })}
      {vol && vol.value != null && (
        <div className="text-ops-muted">Volume: {compactNum(vol.value)}</div>
      )}
    </div>
  );
}

// Generic two-series time-series chart. `data` rows are { t: unixSeconds, [key]: pct }.
// `series` is [{ key, color, label }]. With `volumeKey`, that field renders as faded
// bars on a right-hand axis. Used by odds history, macro poll history, and drawer polling.
export default function TrendChart({ data, series, volumeKey, height = 224, domain = AUTO_DOMAIN }) {
  const [ref, width] = useElementWidth();
  return (
    <div ref={ref} style={{ height }} className="w-full">
      {width > 0 && (
        <ComposedChart
          width={width}
          height={height}
          data={data}
          margin={{ top: 5, right: volumeKey ? 4 : 10, bottom: 0, left: -8 }}
        >
          <CartesianGrid stroke="#1f2738" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={fmtTs}
            tick={{ fill: "#8a97ac", fontSize: 11 }}
            stroke="#1f2738"
            minTickGap={48}
          />
          <YAxis
            yAxisId="pct"
            domain={domain}
            allowDecimals={false}
            tick={{ fill: "#8a97ac", fontSize: 11 }}
            stroke="#1f2738"
            tickFormatter={(v) => `${v}%`}
            width={40}
          />
          {volumeKey && (
            <YAxis
              yAxisId="vol"
              orientation="right"
              tick={{ fill: "#5b6678", fontSize: 10 }}
              stroke="#1f2738"
              tickFormatter={compactNum}
              width={42}
            />
          )}
          <Tooltip content={<TrendTooltip series={series} volumeKey={volumeKey} />} />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: "#8a97ac" }}
            formatter={(v) => series.find((x) => x.key === v)?.label || v}
          />
          {/* Volume bars first so the price lines render on top. */}
          {volumeKey && (
            <Bar
              yAxisId="vol"
              dataKey={volumeKey}
              fill="#8a97ac"
              fillOpacity={0.16}
              isAnimationActive={false}
              legendType="none"
            />
          )}
          {series.map((s) => (
            <Line
              yAxisId="pct"
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              connectNulls
              legendType="plainline"
            />
          ))}
        </ComposedChart>
      )}
    </div>
  );
}
