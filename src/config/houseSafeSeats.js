// Safe seats per state for the election-night House tally (src/lib/calls.js): the
// districts Cook Political Report rates Solid/Safe for a party, counted for that
// party once the state's polls have closed. Every seat rated Likely or closer (all
// of the watchlist in races.config.js, plus ~25 other competitive seats) is
// excluded and stays uncalled until its markets say otherwise.
//
// Derived from Wikipedia's "2026 United States House of Representatives election
// ratings" page (Cook column, Sept 25, 2026): a seat absent from its competitive
// table is Cook-safe, and takes the party of its 2026 Cook PVI (listed on each
// state's page of the main House elections article); seats in the table count only
// when Cook says Solid/Safe. The totals (185 D, 176 R) equal HOUSE_OUTLOOK.ratings
// safeD/safeR in races.config.js. Re-derive if Cook re-rates a seat to/from safe.
export const HOUSE_SAFE_SEATS = {
  AL: { D: 1, R: 5 },
  AR: { D: 0, R: 4 },
  AZ: { D: 3, R: 3 },
  CA: { D: 43, R: 4 },
  CO: { D: 4, R: 1 },
  CT: { D: 5, R: 0 },
  DE: { D: 1, R: 0 },
  FL: { D: 4, R: 17 },
  GA: { D: 5, R: 9 },
  HI: { D: 2, R: 0 },
  IA: { D: 0, R: 1 },
  ID: { D: 0, R: 2 },
  IL: { D: 14, R: 3 },
  IN: { D: 1, R: 7 },
  KS: { D: 1, R: 3 },
  KY: { D: 1, R: 4 },
  LA: { D: 1, R: 5 },
  MA: { D: 9, R: 0 },
  MD: { D: 7, R: 1 },
  ME: { D: 1, R: 0 },
  MI: { D: 5, R: 4 },
  MN: { D: 3, R: 3 },
  MO: { D: 2, R: 5 },
  MS: { D: 1, R: 3 },
  MT: { D: 0, R: 1 },
  NC: { D: 3, R: 9 },
  ND: { D: 0, R: 1 },
  NE: { D: 0, R: 2 },
  NH: { D: 1, R: 0 },
  NJ: { D: 8, R: 2 },
  NM: { D: 2, R: 0 },
  NY: { D: 16, R: 5 },
  OH: { D: 2, R: 7 },
  OK: { D: 0, R: 5 },
  OR: { D: 5, R: 1 },
  PA: { D: 7, R: 6 },
  RI: { D: 2, R: 0 },
  SC: { D: 1, R: 5 },
  SD: { D: 0, R: 1 },
  TN: { D: 0, R: 9 },
  TX: { D: 8, R: 24 },
  UT: { D: 1, R: 3 },
  VA: { D: 5, R: 2 },
  VT: { D: 1, R: 0 },
  WA: { D: 7, R: 2 },
  WI: { D: 2, R: 4 },
  WV: { D: 0, R: 2 },
  WY: { D: 0, R: 1 },
}
