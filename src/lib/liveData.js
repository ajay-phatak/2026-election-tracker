// React side of the live-data refresh in ./api.js.
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  fetchHouseRaces,
  fetchRaceOdds,
  getDataAsOf,
  getDataVersion,
  refreshData,
  subscribeData,
} from "./api";
import { ELECTION_DAY, WATCHED_RACES } from "../config/races.config";
import { getElectionNow } from "./simulate";

// Bumps whenever newer data lands; put it in a fetch effect's deps to re-fetch.
export const useDataVersion = () => useSyncExternalStore(subscribeData, getDataVersion);

// When the KV warmer last wrote the data on screen (ms), or null before load.
export const useDataAsOf = () => useSyncExternalStore(subscribeData, getDataAsOf);

// The warmer writes every 15 min, so checking more often than this only spends
// the free-tier function-invocation quota on unchanged data.
const REFRESH_MS = 5 * 60 * 1000;

// Poll for newer data while the tab is visible, and check right away when the
// user comes back to a tab that has been hidden longer than one interval.
// Hidden tabs don't poll at all.
export function useAutoRefresh() {
  useEffect(() => {
    let last = Date.now();
    const tick = () => {
      last = Date.now();
      refreshData();
    };
    const id = setInterval(() => {
      if (document.visibilityState === "visible") tick();
    }, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last >= REFRESH_MS) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}

// Current time, re-read every `ms`, for labels that age (countdown, staleness).
export function useNow(ms = 60 * 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

// Like useNow, but on the election-night clock: honors ?simulate (see
// ./simulate.js) and ticks faster so poll closings land within seconds.
export function useElectionNow(ms = 15 * 1000) {
  const [now, setNow] = useState(getElectionNow);
  useEffect(() => {
    const id = setInterval(() => setNow(getElectionNow()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

// Current odds for every watched Senate race, { GA: { sources }, ... }, for the
// market calls. Reads the same memoized fetches the drawer uses; states that
// failed to load are simply absent.
export function useSenateOdds() {
  const [odds, setOdds] = useState(null);
  const version = useDataVersion();
  useEffect(() => {
    let alive = true;
    Promise.all(
      WATCHED_RACES.senate.map((r) =>
        fetchRaceOdds(r.stateCode).then(
          (d) => [r.stateCode, d],
          () => null
        )
      )
    ).then((rows) => alive && setOdds(Object.fromEntries(rows.filter(Boolean))));
    return () => {
      alive = false;
    };
  }, [version]);
  return odds;
}

// Current odds for every watched House district, { "NY-17": { sources }, ... }, or null.
export function useHouseOdds() {
  const [odds, setOdds] = useState(null);
  const version = useDataVersion();
  useEffect(() => {
    let alive = true;
    fetchHouseRaces()
      .then((d) => alive && setOdds(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [version]);
  return odds;
}

// Whole days from today to Election Day, counted on the US Eastern calendar so
// the number flips at midnight ET for everyone. 0 on the day, negative after.
export function daysToElection(now) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
  return Math.round((Date.parse(ELECTION_DAY) - Date.parse(today)) / 86400000);
}
