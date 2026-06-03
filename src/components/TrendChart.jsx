import { useLayoutEffect, useRef, useState } from "react";
import {
  LineChart,
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

function TrendTooltip({ active, payload, label, series }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-ops-border bg-ops-panel px-3 py-2 text-xs shadow-lg tabular">
      <div className="mb-1 font-semibold text-ops-text">
        {new Date(label * 1000).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>
      {payload.map((p) => {
        const s = series.find((x) => x.key === p.dataKey);
        return (
          <div key={p.dataKey} style={{ color: p.color }}>
            {s?.label || p.dataKey}: {p.value}%
          </div>
        );
      })}
    </div>
  );
}

// Auto-scale Y to the data: pad ~3pts beyond the min/max and snap to a multiple of
// 5 for clean ticks, clamped to [0, 100]. Keeps lines readable instead of squished.
const AUTO_DOMAIN = [
  (min) => Math.max(0, Math.floor((min - 3) / 5) * 5),
  (max) => Math.min(100, Math.ceil((max + 3) / 5) * 5),
];

// Generic two-series time-series line chart. `data` rows are { t: unixSeconds, [key]: pct }.
// `series` is [{ key, color, label }]. Used by odds history, macro poll history, and drawer polling.
export default function TrendChart({ data, series, height = 224, domain = AUTO_DOMAIN }) {
  const [ref, width] = useElementWidth();
  return (
    <div ref={ref} style={{ height }} className="w-full">
      {width > 0 && (
        <LineChart width={width} height={height} data={data} margin={{ top: 5, right: 10, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="#1f2738" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={fmtTs}
            tick={{ fill: "#8a97ac", fontSize: 11 }}
            stroke="#1f2738"
            minTickGap={48}
          />
          <YAxis
            domain={domain}
            allowDecimals={false}
            tick={{ fill: "#8a97ac", fontSize: 11 }}
            stroke="#1f2738"
            tickFormatter={(v) => `${v}%`}
            width={40}
          />
          <Tooltip content={<TrendTooltip series={series} />} />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: "#8a97ac" }}
            formatter={(v) => series.find((x) => x.key === v)?.label || v}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      )}
    </div>
  );
}
