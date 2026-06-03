// Per-race market identifiers were discovered from the live APIs:
//   polymarketSlug -> gamma-api.polymarket.com/events?slug=<slug> (party-named sub-markets)
//   kalshiMarketId -> external-api.kalshi.com .../markets?series_ticker=<id>
// Kalshi state markets are currently illiquid (often no price) — the UI degrades gracefully.
//
// pollParties maps VoteHub us-senator answer `choice` (candidate names) to a party.
// Fragments are matched case-insensitively as substrings; the backend also treats a
// literal "Democrat"/"Republican" choice generically. This list is the one manual
// upkeep point — update it as 2026 fields firm up.
export const WATCHED_RACES = {
  senate: [
    { state: "Georgia", stateCode: "GA", category: "must_keep", incumbent: "Jon Ossoff", party: "D", kalshiMarketId: "SENATEGA", polymarketSlug: "georgia-senate-election-winner", pollParties: { dem: ["Ossoff"], rep: ["Collins", "Carter"] }, notes: "" },
    { state: "Michigan", stateCode: "MI", category: "must_keep", incumbent: "Gary Peters", party: "D", kalshiMarketId: "SENATEMI", polymarketSlug: "michigan-senate-election-winner", pollParties: { dem: ["Stevens", "McMorrow", "El-Sayed"], rep: ["Rogers"] }, notes: "" },
    { state: "Maine", stateCode: "ME", category: "easy_flip", incumbent: "Susan Collins", party: "R", kalshiMarketId: "SENATEME", polymarketSlug: "maine-senate-election-winner", pollParties: { dem: ["Platner", "Mills"], rep: ["Collins"] }, notes: "" },
    { state: "North Carolina", stateCode: "NC", category: "easy_flip", incumbent: "Thom Tillis", party: "R", kalshiMarketId: "SENATENC", polymarketSlug: "north-carolina-senate-election-winner", pollParties: { dem: ["Cooper"], rep: ["Whatley", "Tillis", "Thillis", "Lara Trump"] }, notes: "" },
    { state: "Texas", stateCode: "TX", category: "hard_flip", incumbent: "John Cornyn", party: "R", kalshiMarketId: "SENATETX", polymarketSlug: "texas-senate-election-winner", pollParties: { dem: ["Talarico"], rep: ["Paxton", "Cornyn"] }, notes: "" },
    { state: "Alaska", stateCode: "AK", category: "hard_flip", incumbent: "Dan Sullivan", party: "R", kalshiMarketId: "SENATEAK", polymarketSlug: "alaska-senate-election-winner", pollParties: { dem: ["Peltola"], rep: ["Sullivan"] }, notes: "" },
    { state: "Ohio", stateCode: "OH", category: "hard_flip", incumbent: "Bernie Moreno", party: "R", kalshiMarketId: "SENATEOHS", polymarketSlug: "ohio-senate-election-winner", pollParties: { dem: ["Sherrod Brown"], rep: ["Husted"] }, notes: "" },
    { state: "Iowa", stateCode: "IA", category: "dream_flip", incumbent: "Joni Ernst", party: "R", kalshiMarketId: "SENATEIA", polymarketSlug: "iowa-senate-election-winner", pollParties: { dem: ["Turek", "Wahls"], rep: ["Hinson"] }, notes: "" },
    { state: "Florida", stateCode: "FL", category: "dream_flip", incumbent: "Ashley Moody", party: "R", kalshiMarketId: "SENATEFLS", polymarketSlug: "florida-senate-election-winner", pollParties: { dem: ["Vindman", "Nixon"], rep: ["Moody"] }, notes: "" },
  ]
}

// Chamber-control markets shown in the top MacroMetrics cards.
// Kalshi control markets are live on the elections host as series CONTROLS / CONTROLH
// (per-party markets <SERIES>-2026-D / -R), with candlestick price + volume history.
export const CONTROL_MARKETS = {
  senate: {
    polymarketSlug: "which-party-will-win-the-senate-in-2026",
    kalshi: { series: "CONTROLS", demTicker: "CONTROLS-2026-D", repTicker: "CONTROLS-2026-R" },
  },
  house: {
    polymarketSlug: "which-party-will-win-the-house-in-2026",
    kalshi: { series: "CONTROLH", demTicker: "CONTROLH-2026-D", repTicker: "CONTROLH-2026-R" },
  },
}

// Dark-blue -> light-blue gradient across the difficulty spectrum (easier to scan).
export const CATEGORIES = {
  must_keep:  { label: "Must Keep",  color: "#1e3a8a" },
  easy_flip:  { label: "Easy Flip",  color: "#2563eb" },
  hard_flip:  { label: "Hard Flip",  color: "#60a5fa" },
  dream_flip: { label: "Dream Flip", color: "#bfdbfe" },
}
