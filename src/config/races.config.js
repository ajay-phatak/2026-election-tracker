// Per-race market identifiers were discovered from the live APIs:
//   polymarketSlug -> gamma-api.polymarket.com/events?slug=<slug> (party-named sub-markets)
//   kalshiMarketId -> external-api.kalshi.com .../markets?series_ticker=<id>
// Kalshi state markets are currently illiquid (often no price) — the UI degrades gracefully.
export const WATCHED_RACES = {
  senate: [
    { state: "Georgia", stateCode: "GA", category: "must_keep", incumbent: "Jon Ossoff", party: "D", kalshiMarketId: "SENATEGA", polymarketSlug: "georgia-senate-election-winner", notes: "" },
    { state: "Michigan", stateCode: "MI", category: "must_keep", incumbent: "Gary Peters", party: "D", kalshiMarketId: "SENATEMI", polymarketSlug: "michigan-senate-election-winner", notes: "" },
    { state: "Maine", stateCode: "ME", category: "easy_flip", incumbent: "Susan Collins", party: "R", kalshiMarketId: "SENATEME", polymarketSlug: "maine-senate-election-winner", notes: "" },
    { state: "North Carolina", stateCode: "NC", category: "easy_flip", incumbent: "Thom Tillis", party: "R", kalshiMarketId: "SENATENC", polymarketSlug: "north-carolina-senate-election-winner", notes: "" },
    { state: "Texas", stateCode: "TX", category: "hard_flip", incumbent: "John Cornyn", party: "R", kalshiMarketId: "SENATETX", polymarketSlug: "texas-senate-election-winner", notes: "" },
    { state: "Alaska", stateCode: "AK", category: "hard_flip", incumbent: "Dan Sullivan", party: "R", kalshiMarketId: "SENATEAK", polymarketSlug: "alaska-senate-election-winner", notes: "" },
    { state: "Ohio", stateCode: "OH", category: "hard_flip", incumbent: "Bernie Moreno", party: "R", kalshiMarketId: "SENATEOH", polymarketSlug: "ohio-senate-election-winner", notes: "" },
    { state: "Iowa", stateCode: "IA", category: "dream_flip", incumbent: "Joni Ernst", party: "R", kalshiMarketId: "SENATEIA", polymarketSlug: "iowa-senate-election-winner", notes: "" },
    { state: "Florida", stateCode: "FL", category: "dream_flip", incumbent: "Ashley Moody", party: "R", kalshiMarketId: "SENATEFL", polymarketSlug: "florida-senate-election-winner", notes: "" },
  ]
}

// Chamber-control markets shown in the top MacroMetrics cards.
export const CONTROL_MARKETS = {
  senate: { polymarketSlug: "which-party-will-win-the-senate-in-2026", kalshiMarketId: "KXSENATE" },
  house:  { polymarketSlug: "which-party-will-win-the-house-in-2026",  kalshiMarketId: "KXHOUSE" },
}

export const CATEGORIES = {
  must_keep:  { label: "Must Keep",  color: "#2563eb" },
  easy_flip:  { label: "Easy Flip",  color: "#16a34a" },
  hard_flip:  { label: "Hard Flip",  color: "#d97706" },
  dream_flip: { label: "Dream Flip", color: "#9333ea" },
}
