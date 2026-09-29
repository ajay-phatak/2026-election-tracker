// Dry-run switches for election-night mode, read once from the page URL:
//   ?simulate=2026-11-03T21:30-05:00   pretend it's that moment (the clock keeps
//                                      ticking from there)
//   ?simulateCalls=GA:D,NC:R,NY-17:D   force those races' market odds to 99/1
// Both are inert without the params, and neither touches the network or data.
const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);

// URLSearchParams decodes a literal "+" in a UTC offset (…21:30+00:00) as a space.
const raw = params.get("simulate")?.trim().replace(/ (\d\d:?\d\d)$/, "+$1");
const simulatedAt = raw ? Date.parse(raw) : NaN;
const offset = Number.isFinite(simulatedAt) ? simulatedAt - Date.now() : 0;

export const IS_SIMULATING = Number.isFinite(simulatedAt);

// "Now" for every election-night decision (poll closings, activation, calls).
export const getElectionNow = () => Date.now() + offset;

// { GA: "D", "NY-17": "D" } — race code -> forced winner, from ?simulateCalls.
export const SIMULATED_CALLS = Object.fromEntries(
  (params.get("simulateCalls") || "")
    .split(",")
    .map((pair) => pair.trim().split(":"))
    .filter(([code, party]) => code && (party?.toUpperCase() === "D" || party?.toUpperCase() === "R"))
    .map(([code, party]) => [code.toUpperCase(), party.toUpperCase()])
);
