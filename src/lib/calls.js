import { HOUSE_SAFE_SEATS } from "../config/houseSafeSeats";
import { HOUSE_OUTLOOK, SENATE_OUTLOOK, WATCHED_RACES } from "../config/races.config";
import { raceState, stateClosed } from "./electionNight";
import { SIMULATED_CALLS } from "./simulate";

// Market-based race calls and the election-night seat tallies. These are NOT AP
// calls and must never be worded as official — surface CALLS_FOOTNOTE wherever
// a call or a tally appears.
export const CALLS_FOOTNOTE = "Calls reflect prediction-market odds, not official AP race calls.";

const CALL_BOTH = 97; // every source with data must have the party at least here...
const CALL_SOLO = 99; // ...or here when only one source has data

const hasOdds = (s) => Boolean(s && s.demYes != null && s.repYes != null);

// "D" | "R" | null from a race's market sources, ignoring poll closings.
export function marketCall(sources) {
  const live = (sources || []).filter(hasOdds);
  if (!live.length) return null;
  const need = live.length > 1 ? CALL_BOTH : CALL_SOLO;
  const dem = live.every((s) => s.demYes >= need);
  const rep = live.every((s) => s.repYes >= need);
  return dem === rep ? null : dem ? "D" : "R";
}

// The market call for a watched race at `now`, or null: a race can only be
// called once its state's polls have closed. ?simulateCalls swaps in 99/1 odds.
export function raceCall(race, sources, now) {
  if (!stateClosed(raceState(race), now)) return null;
  const forced = SIMULATED_CALLS[(race.code ?? race.stateCode).toUpperCase()];
  if (forced) {
    const odds = forced === "D" ? { demYes: 99, repYes: 1 } : { demYes: 1, repYes: 99 };
    return marketCall([odds, odds]);
  }
  return marketCall(sources);
}

// Badge text: "Markets: called D" (Nebraska's non-GOP side is independent Osborn).
export const callText = (race, party) =>
  `Markets: called ${race.independent && party === "D" ? `${race.independent} (I)` : party}`;

// Senate seats by outcome. Holdovers are seats not up in 2026 (SENATE_OUTLOOK);
// tracked races add market-called seats; untracked safe seats count for their
// holding party once the state's polls close; everything else is uncalled.
// `oddsByState` is { GA: { sources }, ... }.
export function senateTally(oddsByState, now) {
  const { holdovers, untracked, total } = SENATE_OUTLOOK;
  let safeDem = 0;
  let safeRep = 0;
  for (const [state, u] of Object.entries(untracked)) {
    if (!u.safe || !stateClosed(state, now)) continue;
    if (u.party === "D") safeDem++;
    else safeRep++;
  }
  let dem = holdovers.dem + safeDem;
  let rep = holdovers.rep + safeRep;
  let ind = 0; // Nebraska's Osborn, if called: not counted for either party
  for (const r of WATCHED_RACES.senate) {
    const party = raceCall(r, oddsByState?.[r.stateCode]?.sources, now);
    if (party === "R") rep++;
    else if (party) r.independent ? ind++ : dem++;
  }
  return {
    dem,
    rep,
    ind,
    uncalled: total - dem - rep - ind,
    calledDem: dem - holdovers.dem - safeDem,
    calledRep: rep - holdovers.rep - safeRep,
    safeDem,
    safeRep,
  };
}

// House seats by outcome: watchlist districts with markets use the call rule;
// every other seat counts for its party only if Cook rates it Safe/Solid AND its
// state's polls have closed (HOUSE_SAFE_SEATS holds only such non-watchlist
// seats, so nothing is counted twice). All else is uncalled.
// `oddsByCode` is { "NY-17": { sources }, ... }.
export function houseTally(oddsByCode, now) {
  let calledDem = 0;
  let calledRep = 0;
  for (const d of WATCHED_RACES.house) {
    const party = raceCall(d, oddsByCode?.[d.code]?.sources, now);
    if (party === "D") calledDem++;
    else if (party === "R") calledRep++;
  }
  let safeDem = 0;
  let safeRep = 0;
  for (const [state, n] of Object.entries(HOUSE_SAFE_SEATS)) {
    if (!stateClosed(state, now)) continue;
    safeDem += n.D;
    safeRep += n.R;
  }
  const { total } = HOUSE_OUTLOOK;
  return {
    calledDem,
    calledRep,
    safeDem,
    safeRep,
    dem: calledDem + safeDem,
    rep: calledRep + safeRep,
    uncalled: total - calledDem - calledRep - safeDem - safeRep,
  };
}
