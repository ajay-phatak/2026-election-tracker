// Per-race market identifiers were discovered from the live APIs:
//   polymarketSlug -> gamma-api.polymarket.com/events?slug=<slug> (party-named sub-markets)
//   kalshiMarketId -> external-api.kalshi.com .../markets?series_ticker=<id>
// Kalshi state markets are currently illiquid (often no price) — the UI degrades gracefully.
//
// pollParties maps VoteHub us-senator answer `choice` (candidate names) to a party.
// Fragments are matched case-insensitively as substrings; the backend also treats a
// literal "Democrat"/"Republican" choice generically. List ONLY the general-election
// nominees: a poll counts only when both sides match, so hypothetical or pre-primary
// matchups (e.g. Platner-Collins in Maine, Stevens-Rogers in Michigan) drop out
// instead of blending into the average. Nominees final as of Sept 29, 2026.
// `incumbent: "Open seat"` = the sitting senator isn't on the November ballot.
export const WATCHED_RACES = {
  senate: [
    { state: "Georgia", stateCode: "GA", category: "favored", incumbent: "Jon Ossoff", party: "D", kalshiMarketId: "SENATEGA", polymarketSlug: "georgia-senate-election-winner", pollParties: { dem: ["Ossoff"], rep: ["Collins"] }, notes: "" },
    { state: "Michigan", stateCode: "MI", category: "competitive", incumbent: "Open seat", party: "D", kalshiMarketId: "SENATEMI", polymarketSlug: "michigan-senate-election-winner", pollParties: { dem: ["El-Sayed"], rep: ["Rogers"] }, notes: "" },
    { state: "Maine", stateCode: "ME", category: "competitive", incumbent: "Susan Collins", party: "R", kalshiMarketId: "SENATEME", polymarketSlug: "maine-senate-election-winner", pollParties: { dem: ["Jackson"], rep: ["Collins"] }, notes: "" },
    { state: "North Carolina", stateCode: "NC", category: "favored", incumbent: "Open seat", party: "R", kalshiMarketId: "SENATENC", polymarketSlug: "north-carolina-senate-election-winner", pollParties: { dem: ["Cooper"], rep: ["Whatley"] }, notes: "" },
    { state: "Texas", stateCode: "TX", category: "competitive", incumbent: "Open seat", party: "R", kalshiMarketId: "SENATETX", polymarketSlug: "texas-senate-election-winner", pollParties: { dem: ["Talarico"], rep: ["Paxton"] }, notes: "" },
    { state: "Alaska", stateCode: "AK", category: "competitive", incumbent: "Dan Sullivan", party: "R", kalshiMarketId: "SENATEAK", polymarketSlug: "alaska-senate-election-winner", pollParties: { dem: ["Peltola"], rep: ["Sullivan"] }, notes: "" },
    { state: "Ohio", stateCode: "OH", category: "competitive", incumbent: "Jon Husted", party: "R", kalshiMarketId: "SENATEOHS", polymarketSlug: "ohio-senate-election-winner", pollParties: { dem: ["Sherrod Brown"], rep: ["Husted"] }, notes: "" },
    { state: "Iowa", stateCode: "IA", category: "uphill", incumbent: "Open seat", party: "R", kalshiMarketId: "SENATEIA", polymarketSlug: "iowa-senate-election-winner", pollParties: { dem: ["Turek"], rep: ["Hinson"] }, notes: "" },
    { state: "Florida", stateCode: "FL", category: "long_shot", incumbent: "Ashley Moody", party: "R", kalshiMarketId: "SENATEFLS", polymarketSlug: "florida-senate-election-winner", pollParties: { dem: ["Nixon"], rep: ["Moody"] }, notes: "" },
    { state: "Kansas", stateCode: "KS", category: "long_shot", incumbent: "Roger Marshall", party: "R", kalshiMarketId: "SENATEKS", polymarketSlug: "kansas-senate-election-winner", pollParties: { dem: ["Hamilton"], rep: ["Marshall"] }, notes: "" },
    // Darline Graham was appointed after Lindsey Graham's death (July 2026) and won
    // the Aug 25 GOP runoff; "Graham" matches her VoteHub choice name.
    { state: "South Carolina", stateCode: "SC", category: "long_shot", incumbent: "Darline Graham", party: "R", kalshiMarketId: "SENATESC", polymarketSlug: "south-carolina-senate-election-winner", pollParties: { dem: ["Andrews"], rep: ["Graham"] }, notes: "" },
    // No Democrat is on the ballot (nominee Cindy Burbank withdrew), so independent
    // Dan Osborn is tracked on the "dem" (anti-GOP) side. "Independent" in the hints
    // maps Polymarket's "Will an independent win…" market; since the side keeps its
    // highest-priced market, it outranks the ~0% Democrats market. Kalshi's Osborn
    // market is -26-DOSB, not -26-D (Burbank).
    { state: "Nebraska", stateCode: "NE", category: "long_shot", incumbent: "Pete Ricketts", party: "R", kalshiMarketId: "SENATENE", kalshiDemTicker: "SENATENE-26-DOSB", polymarketSlug: "nebraska-senate-election-winner", pollParties: { dem: ["Osborn", "Independent"], rep: ["Ricketts"] }, notes: "Dan Osborn is an independent. With no Democrat on the ballot, the tracker shows him on the Democratic side of the odds and polls." },
  ],
  // Curated competitive House districts. Criterion: every district Cook Political
  // Report rates Tossup or Lean, plus ME-2 (Likely R — the cycle's biggest expected
  // flip). MI-8 (Likely D since Aug 25, 2026) and CA-45 / NY-19 (Likely D since
  // Sept 25) keep their slots because their Polymarket series are already running.
  // `rating` is Cook's. `incumbent: "Open seat"` = the sitting member isn't running
  // (per the DCCC/NRCC target lists); `party` is the seat's current/last holder.
  // TX-35 is redrawn: its last holder (D) runs elsewhere and Cook rates the new
  // seat Lean R.
  // `polymarketSlug` is set where a per-district market exists — note Polymarket
  // zero-pads district numbers ("nj-07-..."), and CA-22 uses a bespoke slug. ME-2
  // has no general-election market yet (degrades to rating + news). House omits
  // `kalshiMarketId` (no liquid per-district Kalshi markets) and `pollParties`
  // (district party sub-markets are already named "Democratic/Republican Party").
  house: [
    { code: "AZ-1", state: "Arizona", district: "AZ-1", incumbent: "Open seat", party: "R", rating: "leanD", polymarketSlug: "az-01-house-election-winner" },
    { code: "AZ-6", state: "Arizona", district: "AZ-6", incumbent: "Juan Ciscomani", party: "R", rating: "tossup", polymarketSlug: "az-06-house-election-winner" },
    { code: "CA-13", state: "California", district: "CA-13", incumbent: "Adam Gray", party: "D", rating: "leanD", polymarketSlug: "ca-13-house-election-winner" },
    { code: "CA-22", state: "California", district: "CA-22", incumbent: "David Valadao", party: "R", rating: "tossup", polymarketSlug: "which-party-will-win-the-house-race-for-the-ca-22-seat" },
    { code: "CA-45", state: "California", district: "CA-45", incumbent: "Derek Tran", party: "D", rating: "likelyD", polymarketSlug: "ca-45-house-election-winner" },
    { code: "CA-48", state: "California", district: "CA-48", incumbent: "Open seat", party: "R", rating: "leanD", polymarketSlug: "ca-48-house-election-winner" },
    { code: "CO-5", state: "Colorado", district: "CO-5", incumbent: "Jeff Crank", party: "R", rating: "leanR", polymarketSlug: "co-05-house-election-winner" },
    { code: "CO-8", state: "Colorado", district: "CO-8", incumbent: "Gabe Evans", party: "R", rating: "tossup", polymarketSlug: "co-08-house-election-winner" },
    { code: "FL-13", state: "Florida", district: "FL-13", incumbent: "Anna Paulina Luna", party: "R", rating: "leanR", polymarketSlug: "fl-13-house-election-winner" },
    { code: "FL-14", state: "Florida", district: "FL-14", incumbent: "Kathy Castor", party: "D", rating: "tossup", polymarketSlug: "fl-14-house-election-winner" },
    { code: "FL-22", state: "Florida", district: "FL-22", incumbent: "Open seat", party: "D", rating: "tossup", polymarketSlug: "fl-22-house-election-winner" },
    { code: "FL-25", state: "Florida", district: "FL-25", incumbent: "Jared Moskowitz", party: "D", rating: "tossup", polymarketSlug: "fl-25-house-election-winner" },
    { code: "FL-27", state: "Florida", district: "FL-27", incumbent: "María Elvira Salazar", party: "R", rating: "leanR", polymarketSlug: "fl-27-house-election-winner" },
    { code: "IA-1", state: "Iowa", district: "IA-1", incumbent: "Mariannette Miller-Meeks", party: "R", rating: "tossup", polymarketSlug: "ia-01-house-election-winner" },
    { code: "IA-2", state: "Iowa", district: "IA-2", incumbent: "Open seat", party: "R", rating: "leanR", polymarketSlug: "ia-02-house-election-winner" },
    { code: "IA-3", state: "Iowa", district: "IA-3", incumbent: "Zach Nunn", party: "R", rating: "tossup", polymarketSlug: "ia-03-house-election-winner" },
    { code: "ME-2", state: "Maine", district: "ME-2", incumbent: "Open seat", party: "D", rating: "likelyR" },
    { code: "MI-4", state: "Michigan", district: "MI-4", incumbent: "Bill Huizenga", party: "R", rating: "leanR", polymarketSlug: "mi-04-house-election-winner" },
    { code: "MI-7", state: "Michigan", district: "MI-7", incumbent: "Tom Barrett", party: "R", rating: "tossup", polymarketSlug: "mi-07-house-election-winner" },
    { code: "MI-8", state: "Michigan", district: "MI-8", incumbent: "Kristen McDonald Rivet", party: "D", rating: "likelyD", polymarketSlug: "mi-08-house-election-winner" },
    { code: "MI-10", state: "Michigan", district: "MI-10", incumbent: "Open seat", party: "R", rating: "tossup", polymarketSlug: "mi-10-house-election-winner" },
    { code: "MT-1", state: "Montana", district: "MT-1", incumbent: "Open seat", party: "R", rating: "leanR", polymarketSlug: "mt-01-house-election-winner" },
    { code: "NC-1", state: "North Carolina", district: "NC-1", incumbent: "Don Davis", party: "D", rating: "leanR", polymarketSlug: "nc-01-house-election-winner" },
    { code: "NC-11", state: "North Carolina", district: "NC-11", incumbent: "Open seat", party: "R", rating: "tossup", polymarketSlug: "nc-11-house-election-winner" },
    { code: "NE-2", state: "Nebraska", district: "NE-2", incumbent: "Open seat", party: "R", rating: "leanD", polymarketSlug: "ne-02-house-election-winner" },
    { code: "NJ-7", state: "New Jersey", district: "NJ-7", incumbent: "Tom Kean Jr.", party: "R", rating: "leanD", polymarketSlug: "nj-07-house-election-winner" },
    { code: "NM-2", state: "New Mexico", district: "NM-2", incumbent: "Gabe Vasquez", party: "D", rating: "leanD", polymarketSlug: "nm-02-house-election-winner" },
    { code: "NV-3", state: "Nevada", district: "NV-3", incumbent: "Susie Lee", party: "D", rating: "leanD", polymarketSlug: "nv-03-house-election-winner" },
    { code: "NY-3", state: "New York", district: "NY-3", incumbent: "Tom Suozzi", party: "D", rating: "leanD", polymarketSlug: "ny-03-house-election-winner" },
    { code: "NY-4", state: "New York", district: "NY-4", incumbent: "Laura Gillen", party: "D", rating: "leanD", polymarketSlug: "ny-04-house-election-winner" },
    { code: "NY-17", state: "New York", district: "NY-17", incumbent: "Mike Lawler", party: "R", rating: "tossup", polymarketSlug: "ny-17-house-election-winner" },
    { code: "NY-19", state: "New York", district: "NY-19", incumbent: "Josh Riley", party: "D", rating: "likelyD", polymarketSlug: "ny-19-house-election-winner" },
    { code: "OH-1", state: "Ohio", district: "OH-1", incumbent: "Greg Landsman", party: "D", rating: "leanD", polymarketSlug: "oh-01-house-election-winner" },
    { code: "OH-7", state: "Ohio", district: "OH-7", incumbent: "Max Miller", party: "R", rating: "tossup", polymarketSlug: "oh-07-house-election-winner" },
    { code: "OH-9", state: "Ohio", district: "OH-9", incumbent: "Marcy Kaptur", party: "D", rating: "tossup", polymarketSlug: "oh-09-house-election-winner" },
    { code: "PA-7", state: "Pennsylvania", district: "PA-7", incumbent: "Ryan Mackenzie", party: "R", rating: "tossup", polymarketSlug: "pa-07-house-election-winner" },
    { code: "PA-8", state: "Pennsylvania", district: "PA-8", incumbent: "Rob Bresnahan", party: "R", rating: "tossup", polymarketSlug: "pa-08-house-election-winner" },
    { code: "PA-10", state: "Pennsylvania", district: "PA-10", incumbent: "Scott Perry", party: "R", rating: "tossup", polymarketSlug: "pa-10-house-election-winner" },
    { code: "TX-15", state: "Texas", district: "TX-15", incumbent: "Monica De La Cruz", party: "R", rating: "tossup", polymarketSlug: "tx-15-house-election-winner" },
    { code: "TX-28", state: "Texas", district: "TX-28", incumbent: "Henry Cuellar", party: "D", rating: "leanD", polymarketSlug: "tx-28-house-election-winner" },
    { code: "TX-34", state: "Texas", district: "TX-34", incumbent: "Vicente Gonzalez", party: "D", rating: "tossup", polymarketSlug: "tx-34-house-election-winner" },
    { code: "TX-35", state: "Texas", district: "TX-35", incumbent: "Open seat", party: "D", rating: "leanR", polymarketSlug: "tx-35-house-election-winner" },
    { code: "VA-1", state: "Virginia", district: "VA-1", incumbent: "Rob Wittman", party: "R", rating: "leanR", polymarketSlug: "va-01-house-election-winner" },
    { code: "VA-2", state: "Virginia", district: "VA-2", incumbent: "Jen Kiggans", party: "R", rating: "tossup", polymarketSlug: "va-02-house-election-winner" },
    { code: "WA-3", state: "Washington", district: "WA-3", incumbent: "Marie Gluesenkamp Perez", party: "D", rating: "tossup", polymarketSlug: "wa-03-house-election-winner" },
    { code: "WI-1", state: "Wisconsin", district: "WI-1", incumbent: "Bryan Steil", party: "R", rating: "leanR", polymarketSlug: "wi-01-house-election-winner" },
    { code: "WI-3", state: "Wisconsin", district: "WI-3", incumbent: "Derrick Van Orden", party: "R", rating: "tossup", polymarketSlug: "wi-03-house-election-winner" },
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
// Tiers are named by how likely a Democratic win is, NOT by hold-vs-flip: the old
// "Must Keep"/"Easy Flip" split implied the held seats were the safest ones, which
// the odds don't bear out (a held seat can be shakier than a favorable pickup).
export const CATEGORIES = {
  favored:     { label: "Favored",     color: "#1e3a8a" },
  competitive: { label: "Competitive", color: "#2563eb" },
  uphill:      { label: "Uphill",      color: "#60a5fa" },
  long_shot:   { label: "Long Shot",   color: "#bfdbfe" },
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
//
// `current` is the sworn 119th Congress as of Sept 9, 2026 — vacancies are FL-20 (D)
// and TX-23 (R). `ind` is CA-3 (left the GOP). `ratings` starts from Cook Political
// Report's Sept 25, 2026 ratings (listed seats use Cook's rating; every unlisted seat
// counts as safe for its current holder's party), taken from Wikipedia's ratings
// table since Cook is paywalled. The totals match Cook's published summary: 208
// D-favored, 205 R-favored, 22 toss-ups. The safe D/R split is derived.
// 185+12+11+22+10+19+176 = 435.
export const HOUSE_OUTLOOK = {
  majority: 218,
  total: 435,
  current: { dem: 214, rep: 218, ind: 1, vacant: 2 },
  ratings: { safeD: 185, likelyD: 12, leanD: 11, tossup: 22, leanR: 10, likelyR: 19, safeR: 176 },
  asOf: "September 25, 2026",
  source: "Cook Political Report race ratings",
}
