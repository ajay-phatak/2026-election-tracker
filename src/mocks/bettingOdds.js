// MOCK DATA — per-race betting market odds (Democratic win probability).
// Keyed by stateCode. Each entry: { kalshi: { demWinProb }, polymarket: { demWinProb }, lastUpdated }.
//
// TODO(api): replace with Kalshi + Polymarket per-race market APIs, resolved via the
// kalshiMarketId / polymarketSlug fields in races.config.js.
// FL and AK are intentionally left empty to exercise the drawer's empty state.
export const oddsByState = {
  GA: { kalshi: { demWinProb: 58 }, polymarket: { demWinProb: 61 }, lastUpdated: "2026-06-03T13:30:00Z" },
  MI: { kalshi: { demWinProb: 67 }, polymarket: { demWinProb: 64 }, lastUpdated: "2026-06-03T13:30:00Z" },
  ME: { kalshi: { demWinProb: 49 }, polymarket: { demWinProb: 52 }, lastUpdated: "2026-06-03T13:30:00Z" },
  NC: { kalshi: { demWinProb: 47 }, polymarket: { demWinProb: 45 }, lastUpdated: "2026-06-03T13:30:00Z" },
  TX: { kalshi: { demWinProb: 31 }, polymarket: { demWinProb: 34 }, lastUpdated: "2026-06-03T13:30:00Z" },
  OH: { kalshi: { demWinProb: 33 }, polymarket: { demWinProb: 29 }, lastUpdated: "2026-06-03T13:30:00Z" },
  IA: { kalshi: { demWinProb: 24 }, polymarket: { demWinProb: 27 }, lastUpdated: "2026-06-03T13:30:00Z" },
  // FL — no market data yet (empty-state demo)
  // AK — no market data yet (empty-state demo)
};
