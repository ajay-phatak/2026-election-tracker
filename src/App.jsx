import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import MacroMetrics from "./components/MacroMetrics";
import HouseSection from "./components/HouseSection";
import LoadingScreen from "./components/LoadingScreen";
import AdSlot from "./components/AdSlot";
import { prefetchRaces } from "./lib/api";
import SeatTally from "./components/SeatTally";
import { daysToElection, useAutoRefresh, useDataAsOf, useElectionNow, useNow } from "./lib/liveData";
import { formatET, isElectionNight, nextClosings } from "./lib/electionNight";
import { WATCHED_RACES } from "./config/races.config";
import { AD_SLOTS } from "./config/ads.config";

// Map (+ topojson) and the race drawer (+ charts) load as separate chunks.
const USMap = lazy(() => import("./components/USMap"));
const RaceDrawer = lazy(() => import("./components/RaceDrawer"));

const LOADER_MAX_MS = 8000;

// Data older than this (three missed 15-min warms) is flagged as delayed.
const STALE_MS = 45 * 60 * 1000;

const formatAsOf = (ms) =>
  new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

// Header status: the "data as of" line reflects when the KV warmer last wrote
// the data on screen, turning amber when that's older than STALE_MS.
function useFreshness() {
  const asOf = useDataAsOf();
  const now = useNow();
  return { asOf, stale: asOf != null && now - asOf > STALE_MS, now };
}

function Countdown({ now }) {
  const days = daysToElection(now);
  if (days < 0) return null;
  const label =
    days === 0 ? "Election Day" : days === 1 ? "Election Day is tomorrow" : `${days} days to Election Day`;
  return (
    <span className="rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-ops-text tabular">
      {label}
    </span>
  );
}

// Election Day header: the next batch of poll closings, then "All polls closed".
function PollClosings({ now }) {
  const next = nextClosings(now);
  return (
    <span className="rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-ops-text tabular">
      {next ? `Next poll closings: ${formatET(next.at)} — ${next.states.join(", ")}` : "All polls closed"}
    </span>
  );
}

export default function App() {
  const [selectedCode, setSelectedCode] = useState(null);
  const [ready, setReady] = useState(false);

  const handleReady = useCallback(() => setReady(true), []);

  // Never hold the full-screen loader longer than this: if the first data is
  // slow (each request can take up to 15s to time out, twice with the
  // fallback), show the dashboard and let the cards keep their own skeletons.
  useEffect(() => {
    const id = setTimeout(handleReady, LOADER_MAX_MS);
    return () => clearTimeout(id);
  }, [handleReady]);

  // Warm per-state odds/history/polls in the background so drawers open instantly.
  useEffect(() => {
    prefetchRaces(WATCHED_RACES.senate.map((r) => r.stateCode));
  }, []);

  useAutoRefresh();
  const { asOf, stale } = useFreshness();
  const electionNow = useElectionNow();

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <LoadingScreen visible={!ready} />
      {/* Header */}
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-ops-text sm:text-xl">
            2026 Midterm Elections Tracker
          </h1>
          <p className="mt-0.5 text-xs text-ops-muted">
            Live battleground tracker · markets, polls &amp; approval at a glance
          </p>
        </div>
        <div className="mt-1 flex flex-col items-start gap-1.5 sm:mt-0 sm:items-end">
          {isElectionNight(electionNow) ? (
            <PollClosings now={electionNow} />
          ) : (
            <Countdown now={electionNow} />
          )}
          <div className="text-[10px] uppercase tracking-widest text-ops-muted/70">
            {asOf == null ? (
              "Live data"
            ) : stale ? (
              <span className="text-[#f59e0b]">Data delayed · last update {formatAsOf(asOf)}</span>
            ) : (
              `Data as of ${formatAsOf(asOf)}`
            )}{" "}
            · Polymarket · Kalshi · VoteHub
          </div>
        </div>
      </header>

      {/* Macro metrics */}
      <MacroMetrics onReady={handleReady} />

      {/* Election-night seat counts (renders nothing on other days) */}
      <SeatTally />

      {/* Map centerpiece */}
      <main className="rounded-2xl border border-ops-border bg-ops-panel/40 p-4 sm:p-5">
        <Suspense
          fallback={<div className="h-[510px] animate-pulse rounded-xl bg-ops-panel-2/60 sm:h-[450px]" />}
        >
          <USMap onSelectRace={setSelectedCode} />
        </Suspense>
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

      <Suspense fallback={null}>
        <RaceDrawer
          stateCode={selectedCode}
          onClose={() => setSelectedCode(null)}
        />
      </Suspense>
    </div>
  );
}
