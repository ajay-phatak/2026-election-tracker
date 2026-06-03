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
    { state: "Ohio", stateCode: "OH", category: "hard_flip", incumbent: "Bernie Moreno", party: "R", kalshiMarketId: "SENATEOH", polymarketSlug: "ohio-senate-election-winner", pollParties: { dem: ["Sherrod Brown"], rep: ["Husted"] }, notes: "" },
    { state: "Iowa", stateCode: "IA", category: "dream_flip", incumbent: "Joni Ernst", party: "R", kalshiMarketId: "SENATEIA", polymarketSlug: "iowa-senate-election-winner", pollParties: { dem: ["Turek", "Wahls"], rep: ["Hinson"] }, notes: "" },
    { state: "Florida", stateCode: "FL", category: "dream_flip", incumbent: "Ashley Moody", party: "R", kalshiMarketId: "SENATEFL", polymarketSlug: "florida-senate-election-winner", pollParties: { dem: ["Vindman", "Nixon"], rep: ["Moody"] }, notes: "" },
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
