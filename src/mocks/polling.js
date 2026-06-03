// MOCK DATA — per-race polling averages (last 6 polls, oldest -> newest).
// Keyed by stateCode. Each entry: { date, dem, rep, pollster }.
//
// TODO(api): replace with a polling-average API (e.g. 538 / RCP / VoteHub).
// FL and AK are intentionally left empty to exercise the drawer's empty state.
export const pollingByState = {
  GA: [
    { date: "2026-01-15", dem: 48, rep: 47, pollster: "Quinnipiac" },
    { date: "2026-02-20", dem: 47, rep: 48, pollster: "Marist" },
    { date: "2026-03-18", dem: 49, rep: 46, pollster: "Emerson" },
    { date: "2026-04-22", dem: 48, rep: 48, pollster: "AtlasIntel" },
    { date: "2026-05-14", dem: 50, rep: 46, pollster: "Quinnipiac" },
    { date: "2026-05-28", dem: 49, rep: 47, pollster: "Marist" },
  ],
  MI: [
    { date: "2026-01-12", dem: 49, rep: 45, pollster: "EPIC-MRA" },
    { date: "2026-02-18", dem: 48, rep: 46, pollster: "Marist" },
    { date: "2026-03-22", dem: 50, rep: 45, pollster: "Emerson" },
    { date: "2026-04-19", dem: 49, rep: 46, pollster: "Quinnipiac" },
    { date: "2026-05-10", dem: 51, rep: 44, pollster: "EPIC-MRA" },
    { date: "2026-05-30", dem: 50, rep: 45, pollster: "Marist" },
  ],
  ME: [
    { date: "2026-01-20", dem: 44, rep: 50, pollster: "PPP" },
    { date: "2026-02-24", dem: 45, rep: 49, pollster: "UNH" },
    { date: "2026-03-26", dem: 46, rep: 48, pollster: "Emerson" },
    { date: "2026-04-28", dem: 47, rep: 48, pollster: "Quinnipiac" },
    { date: "2026-05-16", dem: 47, rep: 47, pollster: "PPP" },
    { date: "2026-05-29", dem: 48, rep: 47, pollster: "UNH" },
  ],
  NC: [
    { date: "2026-01-18", dem: 45, rep: 48, pollster: "Meredith" },
    { date: "2026-02-21", dem: 46, rep: 48, pollster: "High Point" },
    { date: "2026-03-20", dem: 47, rep: 47, pollster: "Emerson" },
    { date: "2026-04-24", dem: 47, rep: 47, pollster: "Quinnipiac" },
    { date: "2026-05-12", dem: 48, rep: 46, pollster: "Meredith" },
    { date: "2026-05-27", dem: 48, rep: 47, pollster: "High Point" },
  ],
  TX: [
    { date: "2026-01-22", dem: 43, rep: 51, pollster: "UT-Tyler" },
    { date: "2026-02-26", dem: 44, rep: 51, pollster: "Texas Politics" },
    { date: "2026-03-24", dem: 44, rep: 50, pollster: "Emerson" },
    { date: "2026-04-26", dem: 45, rep: 50, pollster: "Quinnipiac" },
    { date: "2026-05-15", dem: 45, rep: 49, pollster: "UT-Tyler" },
    { date: "2026-05-31", dem: 46, rep: 49, pollster: "Texas Politics" },
  ],
  OH: [
    { date: "2026-01-16", dem: 43, rep: 50, pollster: "Baldwin Wallace" },
    { date: "2026-02-19", dem: 44, rep: 50, pollster: "Emerson" },
    { date: "2026-03-23", dem: 44, rep: 49, pollster: "Suffolk" },
    { date: "2026-04-21", dem: 45, rep: 49, pollster: "Quinnipiac" },
    { date: "2026-05-13", dem: 45, rep: 48, pollster: "Baldwin Wallace" },
    { date: "2026-05-26", dem: 46, rep: 48, pollster: "Emerson" },
  ],
  IA: [
    { date: "2026-01-19", dem: 42, rep: 51, pollster: "Selzer" },
    { date: "2026-02-23", dem: 43, rep: 51, pollster: "Emerson" },
    { date: "2026-03-25", dem: 43, rep: 50, pollster: "Selzer" },
    { date: "2026-04-27", dem: 44, rep: 50, pollster: "Quinnipiac" },
    { date: "2026-05-17", dem: 45, rep: 49, pollster: "Selzer" },
    { date: "2026-06-01", dem: 45, rep: 49, pollster: "Emerson" },
  ],
  // FL — no polling yet (empty-state demo)
  // AK — no polling yet (empty-state demo)
};
