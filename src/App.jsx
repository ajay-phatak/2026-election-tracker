import { useEffect, useState } from "react";
import MacroMetrics from "./components/MacroMetrics";
import USMap from "./components/USMap";
import RaceDrawer from "./components/RaceDrawer";
import { prefetchRaces } from "./lib/api";
import { WATCHED_RACES } from "./config/races.config";

export default function App() {
  const [selectedStateCode, setSelectedStateCode] = useState(null);

  // Warm per-state odds/history/polls in the background so drawers open instantly.
  useEffect(() => {
    prefetchRaces(WATCHED_RACES.senate.map((r) => r.stateCode));
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent shadow-[0_0_8px_#2563eb]" />
            <h1 className="text-lg font-extrabold tracking-tight text-ops-text sm:text-xl">
              2026 Midterm Elections Tracker
            </h1>
          </div>
          <p className="mt-0.5 text-xs text-ops-muted">
            Live battleground tracker · markets, polls &amp; approval at a glance
          </p>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-ops-muted/70">
          Live data · Polymarket · Kalshi · VoteHub
        </div>
      </header>

      {/* Macro metrics */}
      <MacroMetrics />

      {/* Map centerpiece */}
      <main className="min-h-[480px] flex-1 rounded-2xl border border-ops-border bg-ops-panel/40 p-4 sm:p-5">
        <USMap onSelectRace={setSelectedStateCode} />
      </main>

      <footer className="text-center text-[10px] uppercase tracking-widest text-ops-muted/50">
        For reference only · not affiliated with any campaign
      </footer>

      <RaceDrawer
        stateCode={selectedStateCode}
        onClose={() => setSelectedStateCode(null)}
      />
    </div>
  );
}
