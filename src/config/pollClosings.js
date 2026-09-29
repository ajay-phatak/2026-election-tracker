// When ALL polls in each state have closed on Election Day (Tue 2026-11-03), as ISO
// instants. ET is UTC-5 that day (DST ended Nov 1). States that span time zones use
// their latest close.
//
// Source: 270toWin "2026 Election Poll Closing Times" (270towin.com/poll-closing-times/),
// which lists each state/zone in Eastern time; cross-checked against its page
// "Local Poll Closing Times - November 2026 General Election" (multi-zone states close
// at the same local time except Nebraska and Tennessee, which close simultaneously).
// Latest-zone picks: FL 8:00 PM (Panhandle, CT), IN/KY 7:00 PM (Central), KS/ND/SD/TX
// 9:00 PM (Mountain), MI 9:00 PM (Upper Peninsula, CT), ID/OR 11:00 PM (Pacific/Idaho
// panhandle), AK 1:00 AM Wed (Aleutians), HI midnight. Unsure/worth re-checking against
// each state's election office before Election Day: NE and TN (simultaneous-close
// rules), AK (Aleutian zone).
export const POLL_CLOSINGS = {
  IN: "2026-11-03T19:00:00-05:00",
  KY: "2026-11-03T19:00:00-05:00",
  GA: "2026-11-03T19:00:00-05:00",
  SC: "2026-11-03T19:00:00-05:00",
  VT: "2026-11-03T19:00:00-05:00",
  VA: "2026-11-03T19:00:00-05:00",
  NC: "2026-11-03T19:30:00-05:00",
  OH: "2026-11-03T19:30:00-05:00",
  WV: "2026-11-03T19:30:00-05:00",
  AL: "2026-11-03T20:00:00-05:00",
  CT: "2026-11-03T20:00:00-05:00",
  DE: "2026-11-03T20:00:00-05:00",
  FL: "2026-11-03T20:00:00-05:00",
  IL: "2026-11-03T20:00:00-05:00",
  ME: "2026-11-03T20:00:00-05:00",
  MD: "2026-11-03T20:00:00-05:00",
  MA: "2026-11-03T20:00:00-05:00",
  MS: "2026-11-03T20:00:00-05:00",
  MO: "2026-11-03T20:00:00-05:00",
  NH: "2026-11-03T20:00:00-05:00",
  NJ: "2026-11-03T20:00:00-05:00",
  OK: "2026-11-03T20:00:00-05:00",
  PA: "2026-11-03T20:00:00-05:00",
  RI: "2026-11-03T20:00:00-05:00",
  TN: "2026-11-03T20:00:00-05:00",
  DC: "2026-11-03T20:00:00-05:00",
  AR: "2026-11-03T20:30:00-05:00",
  AZ: "2026-11-03T21:00:00-05:00",
  CO: "2026-11-03T21:00:00-05:00",
  IA: "2026-11-03T21:00:00-05:00",
  KS: "2026-11-03T21:00:00-05:00",
  LA: "2026-11-03T21:00:00-05:00",
  MI: "2026-11-03T21:00:00-05:00",
  MN: "2026-11-03T21:00:00-05:00",
  NE: "2026-11-03T21:00:00-05:00",
  NM: "2026-11-03T21:00:00-05:00",
  NY: "2026-11-03T21:00:00-05:00",
  ND: "2026-11-03T21:00:00-05:00",
  SD: "2026-11-03T21:00:00-05:00",
  TX: "2026-11-03T21:00:00-05:00",
  WI: "2026-11-03T21:00:00-05:00",
  WY: "2026-11-03T21:00:00-05:00",
  MT: "2026-11-03T22:00:00-05:00",
  NV: "2026-11-03T22:00:00-05:00",
  UT: "2026-11-03T22:00:00-05:00",
  CA: "2026-11-03T23:00:00-05:00",
  ID: "2026-11-03T23:00:00-05:00",
  OR: "2026-11-03T23:00:00-05:00",
  WA: "2026-11-03T23:00:00-05:00",
  HI: "2026-11-04T00:00:00-05:00",
  AK: "2026-11-04T01:00:00-05:00",
}
