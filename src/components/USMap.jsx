import { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import topology from "us-atlas/states-10m.json";
import { CATEGORIES } from "../config/races.config";
import { getRaceByStateName } from "../lib/races";

const NEUTRAL = "#1c2230";
const NEUTRAL_STROKE = "#0a0e17";

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {Object.values(CATEGORIES).map((cat) => (
        <div key={cat.label} className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: cat.color, boxShadow: `0 0 6px ${cat.color}` }}
          />
          <span className="text-xs font-medium text-ops-muted">{cat.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function USMap({ onSelectRace }) {
  const [tooltip, setTooltip] = useState(null); // { x, y, race }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ops-text">
            Battleground Map
          </h2>
          <p className="text-xs text-ops-muted">
            {Object.keys(CATEGORIES).length} categories · click a highlighted state for detail
          </p>
        </div>
        <Legend />
      </div>

      <div
        className="relative flex-1 overflow-hidden rounded-xl border border-ops-border bg-ops-panel/40"
        onMouseLeave={() => setTooltip(null)}
      >
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1100 }}
          className="h-full w-full"
          style={{ width: "100%", height: "100%" }}
        >
          <Geographies geography={topology}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const race = getRaceByStateName(geo.properties.name);
                const isWatched = Boolean(race);
                const fill = isWatched ? CATEGORIES[race.category].color : NEUTRAL;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    className={isWatched ? "watched-state" : undefined}
                    onClick={isWatched ? () => onSelectRace(race.stateCode) : undefined}
                    onMouseMove={
                      isWatched
                        ? (e) => {
                            const box = e.currentTarget
                              .closest("div.relative")
                              .getBoundingClientRect();
                            setTooltip({
                              x: e.clientX - box.left,
                              y: e.clientY - box.top,
                              race,
                            });
                          }
                        : undefined
                    }
                    onMouseLeave={isWatched ? () => setTooltip(null) : undefined}
                    style={{
                      default: {
                        fill,
                        stroke: isWatched ? "#0a0e17" : NEUTRAL_STROKE,
                        strokeWidth: 0.6,
                        outline: "none",
                      },
                      hover: {
                        fill,
                        stroke: isWatched ? "#ffffff" : NEUTRAL_STROKE,
                        strokeWidth: isWatched ? 1 : 0.6,
                        outline: "none",
                        cursor: isWatched ? "pointer" : "default",
                      },
                      pressed: { fill, outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>

        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-ops-border bg-ops-panel px-2.5 py-1.5 text-xs shadow-lg"
            style={{ left: tooltip.x, top: tooltip.y - 10 }}
          >
            <div className="font-semibold text-ops-text">{tooltip.race.state}</div>
            <div className="text-ops-muted">
              {tooltip.race.incumbent} ({tooltip.race.party})
            </div>
            <div
              className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: CATEGORIES[tooltip.race.category].color }}
            >
              {CATEGORIES[tooltip.race.category].label}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
