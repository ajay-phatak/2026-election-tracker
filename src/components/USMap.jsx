import { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import topology from "us-atlas/states-10m.json";
import { CATEGORIES } from "../config/races.config";
import { getRaceByStateName } from "../lib/races";
import Takeaway from "./Takeaway";

const NEUTRAL = "#1c2230";
const NEUTRAL_STROKE = "#0a0e17";

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ops-muted">
        Categories<span className="text-accent">*</span>
      </span>
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
    <div>
      <div className="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ops-text">
            Senate Battleground Map
          </h2>
          <p className="text-xs text-ops-muted">
            Click a highlighted state for odds, polls &amp; news
          </p>
        </div>
        <Legend />
      </div>

      <div
        className="relative h-[300px] overflow-hidden rounded-xl border border-ops-border bg-ops-panel/40 sm:h-[340px]"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* The default 800x600 viewBox leaves ~50px of dead space above and below
            the drawn map; the explicit viewBox crops it so the map fills the panel. */}
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1100 }}
          viewBox="0 48 800 512"
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

      <div className="mt-2.5 flex justify-center">
        <Takeaway>
          Democrats need to win <b>6 of these 9 states</b> to take control of the Senate.
        </Takeaway>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-ops-muted/60">
        <span className="text-accent">*</span> Categories are based on Ajay’s subjective opinion
        and will be updated as the race develops.
      </p>
    </div>
  );
}
