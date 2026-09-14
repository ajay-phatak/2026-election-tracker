import { useCallback, useEffect, useState } from "react";
import MacroMetrics from "./components/MacroMetrics";
import USMap from "./components/USMap";
import HouseSection from "./components/HouseSection";
import RaceDrawer from "./components/RaceDrawer";
import LoadingScreen from "./components/LoadingScreen";
import AdSlot from "./components/AdSlot";
import { prefetchRaces } from "./lib/api";
import { WATCHED_RACES } from "./config/races.config";
import { AD_SLOTS } from "./config/ads.config";

export default function App() {
  const [selectedCode, setSelectedCode] = useState(null);
  const [ready, setReady] = useState(false);
  const [stale, setStale] = useState(false);
  useEffect(() => {
    const warn = () => setStale(true);
    window.addEventListener('election-tracker-stale', warn);
    return () => window.removeEventListener('election-tracker-stale', warn);
  }, []);

  const handleReady = useCallback(() => setReady(true), []);

  // Warm per-state odds/history/polls in the background so drawers open instantly.
  useEffect(() => {
    prefetchRaces(WATCHED_RACES.senate.map((r) => r.stateCode));
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <LoadingScreen visible={!ready} />
      {/* Header */}
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              title="See source retrieval status below"
              className="h-2.5 w-2.5 rounded-full bg-accent"
            />
            <h1 className="text-lg font-extrabold tracking-tight text-ops-text sm:text-xl">
              2026 Midterm Elections Tracker
            </h1>
          </div>
          <p className="mt-0.5 text-xs text-ops-muted">
            Battleground tracker · market probabilities, polls &amp; approval at a glance
          </p>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-ops-muted/70">
          Polymarket · Kalshi · VoteHub
        </div>
      </header>

      {/* Macro metrics */}
      <div role="status" className="rounded-xl border border-ops-border p-3 text-xs text-ops-muted">
        {stale ? 'Refresh failed: showing last-good browser data. Original dates are retained; values may be stale. ' : 'Fetched on page load; not a streaming feed. Cached responses may lag. '}
        <button className="font-semibold text-accent underline" onClick={() => window.location.reload()}>Refresh / retry all sources</button>
        <span> · Last-good data is stored in this browser. Clear site storage to remove it.</span>
      </div>
      <MacroMetrics onReady={handleReady} />

      {/* Map centerpiece */}
      <main className="rounded-2xl border border-ops-border bg-ops-panel/40 p-4 sm:p-5">
        <USMap onSelectRace={setSelectedCode} />
      </main>

      <AdSlot slot={AD_SLOTS.belowMap} />

      {/* House — overview + competitive-district watchlist */}
      <HouseSection onSelectRace={setSelectedCode} />

      <AdSlot slot={AD_SLOTS.aboveFooter} />

      <footer className="text-center text-[10px] uppercase tracking-widest text-ops-muted/50">
        For reference only · not affiliated with any campaign ·{" "}
        <a
          href="https://ajaycent.com/privacy/"
          className="underline decoration-ops-muted/40 underline-offset-2 hover:text-ops-muted"
        >
          Privacy
        </a>
      </footer>

      <RaceDrawer
        stateCode={selectedCode}
        onClose={() => setSelectedCode(null)}
      />
    </div>
  );
}
