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
    { state: "Maine", stateCode: "ME", category: "hard_flip", incumbent: "Susan Collins", party: "R", kalshiMarketId: "SENATEME", polymarketSlug: "maine-senate-election-winner", pollParties: { dem: ["Platner", "Mills"], rep: ["Collins"] }, notes: "" },
    { state: "North Carolina", stateCode: "NC", category: "easy_flip", incumbent: "Thom Tillis", party: "R", kalshiMarketId: "SENATENC", polymarketSlug: "north-carolina-senate-election-winner", pollParties: { dem: ["Cooper"], rep: ["Whatley", "Tillis", "Thillis", "Lara Trump"] }, notes: "" },
    { state: "Texas", stateCode: "TX", category: "hard_flip", incumbent: "John Cornyn", party: "R", kalshiMarketId: "SENATETX", polymarketSlug: "texas-senate-election-winner", pollParties: { dem: ["Talarico"], rep: ["Paxton", "Cornyn"] }, notes: "" },
    { state: "Alaska", stateCode: "AK", category: "easy_flip", incumbent: "Dan Sullivan", party: "R", kalshiMarketId: "SENATEAK", polymarketSlug: "alaska-senate-election-winner", pollParties: { dem: ["Peltola"], rep: ["Sullivan"] }, notes: "" },
    { state: "Ohio", stateCode: "OH", category: "hard_flip", incumbent: "Bernie Moreno", party: "R", kalshiMarketId: "SENATEOHS", polymarketSlug: "ohio-senate-election-winner", pollParties: { dem: ["Sherrod Brown"], rep: ["Husted"] }, notes: "" },
    { state: "Iowa", stateCode: "IA", category: "hard_flip", incumbent: "Joni Ernst", party: "R", kalshiMarketId: "SENATEIA", polymarketSlug: "iowa-senate-election-winner", pollParties: { dem: ["Turek", "Wahls"], rep: ["Hinson"] }, notes: "" },
    { state: "Florida", stateCode: "FL", category: "dream_flip", incumbent: "Ashley Moody", party: "R", kalshiMarketId: "SENATEFLS", polymarketSlug: "florida-senate-election-winner", pollParties: { dem: ["Vindman", "Nixon"], rep: ["Moody"] }, notes: "" },
  ],
  // Curated competitive House districts (toss-ups + leaners). There are 435 seats,
  // so this is a hand-maintained watchlist, not the full map. `rating` is the primary
  // signal (no free ratings API — edit as the cycle firms up). `polymarketSlug` is set
  // only where a per-district market exists; others degrade to rating + news. House
  // omits `kalshiMarketId` (no liquid per-district Kalshi markets) and `pollParties`
  // (district party sub-markets are already named "Democratic/Republican Party").
  house: [
    { code: "AZ-1", state: "Arizona", district: "AZ-1", incumbent: "David Schweikert", party: "R", rating: "tossup" },
    { code: "AZ-6", state: "Arizona", district: "AZ-6", incumbent: "Juan Ciscomani", party: "R", rating: "tossup" },
    { code: "CA-13", state: "California", district: "CA-13", incumbent: "Adam Gray", party: "D", rating: "tossup", polymarketSlug: "ca-13-house-election-winner" },
    { code: "CA-22", state: "California", district: "CA-22", incumbent: "David Valadao", party: "R", rating: "tossup" },
    { code: "CA-41", state: "California", district: "CA-41", incumbent: "Ken Calvert", party: "R", rating: "tossup", polymarketSlug: "ca-41-house-election-winner" },
    { code: "CA-45", state: "California", district: "CA-45", incumbent: "Derek Tran", party: "D", rating: "tossup", polymarketSlug: "ca-45-house-election-winner" },
    { code: "CA-47", state: "California", district: "CA-47", incumbent: "Dave Min", party: "D", rating: "leanD", polymarketSlug: "ca-47-house-election-winner" },
    { code: "CO-8", state: "Colorado", district: "CO-8", incumbent: "Gabe Evans", party: "R", rating: "tossup" },
    { code: "IA-1", state: "Iowa", district: "IA-1", incumbent: "Mariannette Miller-Meeks", party: "R", rating: "tossup" },
    { code: "IA-3", state: "Iowa", district: "IA-3", incumbent: "Zach Nunn", party: "R", rating: "leanR" },
    { code: "IL-17", state: "Illinois", district: "IL-17", incumbent: "Eric Sorensen", party: "D", rating: "leanD", polymarketSlug: "il-17-house-election-winner" },
    { code: "ME-2", state: "Maine", district: "ME-2", incumbent: "Jared Golden", party: "D", rating: "tossup" },
    { code: "MI-7", state: "Michigan", district: "MI-7", incumbent: "Tom Barrett", party: "R", rating: "tossup" },
    { code: "MI-10", state: "Michigan", district: "MI-10", incumbent: "Open seat", party: "R", rating: "tossup", polymarketSlug: "mi-10-house-election-winner" },
    { code: "NE-2", state: "Nebraska", district: "NE-2", incumbent: "Don Bacon", party: "R", rating: "tossup" },
    { code: "NJ-7", state: "New Jersey", district: "NJ-7", incumbent: "Tom Kean Jr.", party: "R", rating: "leanR" },
    { code: "NM-2", state: "New Mexico", district: "NM-2", incumbent: "Gabe Vasquez", party: "D", rating: "leanD" },
    { code: "NV-3", state: "Nevada", district: "NV-3", incumbent: "Susie Lee", party: "D", rating: "leanD" },
    { code: "NY-4", state: "New York", district: "NY-4", incumbent: "Laura Gillen", party: "D", rating: "tossup" },
    { code: "NY-17", state: "New York", district: "NY-17", incumbent: "Mike Lawler", party: "R", rating: "tossup", polymarketSlug: "ny-17-house-election-winner" },
    { code: "NY-18", state: "New York", district: "NY-18", incumbent: "Pat Ryan", party: "D", rating: "leanD", polymarketSlug: "ny-18-house-election-winner" },
    { code: "NY-19", state: "New York", district: "NY-19", incumbent: "Josh Riley", party: "D", rating: "leanD", polymarketSlug: "ny-19-house-election-winner" },
    { code: "NY-22", state: "New York", district: "NY-22", incumbent: "John Mannion", party: "D", rating: "leanD", polymarketSlug: "ny-22-house-election-winner" },
    { code: "OH-13", state: "Ohio", district: "OH-13", incumbent: "Emilia Sykes", party: "D", rating: "leanD", polymarketSlug: "oh-13-house-election-winner" },
    { code: "OR-5", state: "Oregon", district: "OR-5", incumbent: "Janelle Bynum", party: "D", rating: "leanD" },
    { code: "PA-7", state: "Pennsylvania", district: "PA-7", incumbent: "Ryan Mackenzie", party: "R", rating: "tossup" },
    { code: "PA-8", state: "Pennsylvania", district: "PA-8", incumbent: "Rob Bresnahan", party: "R", rating: "tossup" },
    { code: "PA-10", state: "Pennsylvania", district: "PA-10", incumbent: "Scott Perry", party: "R", rating: "tossup", polymarketSlug: "pa-10-house-election-winner" },
    { code: "PA-17", state: "Pennsylvania", district: "PA-17", incumbent: "Chris Deluzio", party: "D", rating: "leanD", polymarketSlug: "pa-17-house-election-winner" },
    { code: "TX-34", state: "Texas", district: "TX-34", incumbent: "Vicente Gonzalez", party: "D", rating: "leanD", polymarketSlug: "tx-34-house-election-winner" },
    { code: "VA-2", state: "Virginia", district: "VA-2", incumbent: "Jen Kiggans", party: "R", rating: "tossup" },
    { code: "WA-3", state: "Washington", district: "WA-3", incumbent: "Marie Gluesenkamp Perez", party: "D", rating: "leanD" },
  ],
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

// House race ratings (blue -> grey -> red). Used for the watchlist badges and the
// path-to-218 rollup. Order matters: it's the left-to-right order of the rollup bar.
export const RATINGS = {
  safeD:   { label: "Safe D",   short: "D", color: "#1e3a8a" },
  likelyD: { label: "Likely D", short: "D", color: "#2563eb" },
  leanD:   { label: "Lean D",   short: "D", color: "#60a5fa" },
  tossup:  { label: "Toss-up",  short: "—", color: "#9ca3af" },
  leanR:   { label: "Lean R",   short: "R", color: "#f87171" },
  likelyR: { label: "Likely R", short: "R", color: "#dc2626" },
  safeR:   { label: "Safe R",   short: "R", color: "#991b1b" },
}

// Static, hand-maintained House outlook — drives the "seats to 218" bar and the
// ratings rollup. Ratings have no free API, so update this periodically (the one
// manual upkeep point, like pollParties). `ratings` counts must sum to `total`.
export const HOUSE_OUTLOOK = {
  majority: 218,
  total: 435,
  current: { dem: 213, rep: 220, vacant: 2 },
  ratings: { safeD: 185, likelyD: 12, leanD: 14, tossup: 24, leanR: 14, likelyR: 11, safeR: 175 },
  asOf: "2026",
  source: "Composite of public race ratings (editable)",
}
