// MOCK DATA — poll-based top metrics that have no live API wired yet.
// (Senate + House control now come from the live markets via /api/control.)

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
