import { WATCHED_RACES } from "../config/races.config";

// Flat list of every watched race across chambers (currently just senate).
export const ALL_RACES = Object.values(WATCHED_RACES).flat();

const byCode = new Map(ALL_RACES.map((r) => [r.stateCode, r]));
const byName = new Map(ALL_RACES.map((r) => [r.state, r]));

export function getRaceByStateCode(code) {
  return byCode.get(code) ?? null;
}

export function getRaceByStateName(name) {
  return byName.get(name) ?? null;
}
