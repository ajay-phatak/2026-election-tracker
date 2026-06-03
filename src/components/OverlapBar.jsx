// Bar for two-sided prediction markets where Dem-Yes and Rep-Yes are read
// independently and need not sum to 100%:
//   sum > 100  -> the two segments overlap; the overlap renders PURPLE
//   sum < 100  -> the market leaves slack; the gap renders GREY
//   sum = 100  -> clean split, no middle band

const DEM = "#2563eb";
const REP = "#dc2626";
const PURPLE = "#9333ea";
const GREY = "#3a4150";

// Describes the middle band, or null when the values sum to exactly 100.
export function overlapInfo(demYes, repYes) {
  if (demYes == null || repYes == null) return null;
  const sum = demYes + repYes;
  const delta = Math.round(Math.abs(100 - sum) * 10) / 10;
  if (delta === 0) return null;
  return sum > 100
    ? { text: `+${delta}% overlap`, color: PURPLE }
    : { text: `${delta}% gap`, color: GREY };
}

export default function OverlapBar({ demYes, repYes }) {
  if (demYes == null || repYes == null) return null;

  const sum = demYes + repYes;
  const overlap = sum > 100;
  const mid = Math.abs(100 - sum);
  // In the overlap case each colored segment shrinks to its "exclusive" share so
  // the shared middle reads as a single band; otherwise they take their full value.
  const blue = Math.max(0, overlap ? 100 - repYes : demYes);
  const red = Math.max(0, overlap ? 100 - demYes : repYes);
  const midColor = overlap ? PURPLE : GREY;

  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-ops-border">
      <div
        className="h-full transition-all duration-500"
        style={{ width: `${blue}%`, backgroundColor: DEM }}
      />
      {mid > 0 && (
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${mid}%`, backgroundColor: midColor }}
        />
      )}
      <div
        className="h-full transition-all duration-500"
        style={{ width: `${red}%`, backgroundColor: REP }}
      />
    </div>
  );
}
