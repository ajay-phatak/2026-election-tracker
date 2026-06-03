// MOCK DATA — top-of-dashboard macro metrics.
// Shapes mirror what a real API would return so they can be swapped 1:1 later.

// TODO(api): replace with Kalshi / Polymarket "Senate control" market
// (D vs R win probability). Values are win-probability percentages summing to ~100.
export const senateControl = {
  dem: 46,
  rep: 54,
  lastUpdated: "2026-06-03T13:45:00Z",
};

// TODO(api): replace with Kalshi / Polymarket "House control" market.
export const houseControl = {
  dem: 58,
  rep: 42,
  lastUpdated: "2026-06-03T13:45:00Z",
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
