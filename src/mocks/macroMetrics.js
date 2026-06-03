// MOCK DATA — top-of-dashboard macro metrics.
// Shapes mirror what a real API would return so they can be swapped 1:1 later.

// Multi-source control markets — each `sources` entry is one provider's read on the
// D vs R win probability (percentages summing to ~100). The UI lets the user cycle
// between sources with arrows. Add a provider by appending another entry (same shape).
//
// TODO(api): replace each source with its live feed:
//   kalshi     -> Kalshi market API
//   polymarket -> Polymarket market API
//   nyt        -> NYT election model (not published for 2026 yet — add when available)
export const senateControl = {
  sources: [
    { id: "kalshi",     label: "Kalshi",     dem: 46, rep: 54, lastUpdated: "2026-06-03T13:45:00Z" },
    { id: "polymarket", label: "Polymarket", dem: 44, rep: 56, lastUpdated: "2026-06-03T13:38:00Z" },
    // { id: "nyt",     label: "NYT",        dem: null, rep: null, lastUpdated: null },
  ],
};

export const houseControl = {
  sources: [
    { id: "kalshi",     label: "Kalshi",     dem: 58, rep: 42, lastUpdated: "2026-06-03T13:45:00Z" },
    { id: "polymarket", label: "Polymarket", dem: 61, rep: 39, lastUpdated: "2026-06-03T13:38:00Z" },
    // { id: "nyt",     label: "NYT",        dem: null, rep: null, lastUpdated: null },
  ],
};

// TODO(api): replace with a generic-congressional-ballot polling-average API (e.g. 538 / RCP).
// dem/rep are vote-share percentages for "which party's candidate for Congress would you support".
export const genericBallot = {
  dem: 47,
  rep: 44,
  lastUpdated: "2026-06-03T13:45:00Z",
};

// TODO(api): replace with a poll-aggregator approval API (e.g. 538 / RCP / Silver Bulletin).
export const trumpApproval = {
  approve: 43,
  disapprove: 54,
  lastUpdated: "2026-06-02T22:10:00Z",
};
