import {
  senateControl,
  houseControl,
  genericBallot,
  trumpApproval,
} from "../mocks/macroMetrics";
import { formatUpdated } from "../lib/format";

const DEM = "#2563eb";
const REP = "#dc2626";
const APPROVE = "#16a34a";
const DISAPPROVE = "#dc2626";

function SplitBar({ leftPct, rightPct, leftColor, rightColor }) {
  // Segments are sized to their actual values; any remainder (e.g. undecideds on
  // the generic ballot) shows through as the neutral track.
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-ops-border">
      <div
        className="h-full transition-all duration-500"
        style={{ width: `${leftPct}%`, backgroundColor: leftColor }}
      />
      <div
        className="ml-auto h-full transition-all duration-500"
        style={{ width: `${rightPct}%`, backgroundColor: rightColor }}
      />
    </div>
  );
}

function MacroCard({
  title,
  leftLabel,
  rightLabel,
  leftValue,
  rightValue,
  leftColor,
  rightColor,
  lastUpdated,
}) {
  const leftLeads = leftValue >= rightValue;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-ops-border bg-ops-panel/80 p-4 backdrop-blur-sm sm:p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ops-muted">
          {title}
        </h3>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{
            color: leftLeads ? leftColor : rightColor,
            backgroundColor: `${leftLeads ? leftColor : rightColor}1a`,
          }}
        >
          {leftLeads ? leftLabel : rightLabel} +{Math.abs(leftValue - rightValue)}
        </span>
      </div>

      <div className="flex items-end justify-between tabular">
        <div className="flex flex-col">
          <span className="text-2xl font-bold leading-none" style={{ color: leftColor }}>
            {leftValue}%
          </span>
          <span className="mt-1 text-[11px] font-medium text-ops-muted">{leftLabel}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-bold leading-none" style={{ color: rightColor }}>
            {rightValue}%
          </span>
          <span className="mt-1 text-[11px] font-medium text-ops-muted">{rightLabel}</span>
        </div>
      </div>

      <SplitBar
        leftPct={leftValue}
        rightPct={rightValue}
        leftColor={leftColor}
        rightColor={rightColor}
      />

      <p className="text-[10px] uppercase tracking-wide text-ops-muted/70">
        Updated {formatUpdated(lastUpdated)}
      </p>
    </div>
  );
}

export default function MacroMetrics() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MacroCard
        title="Senate Control"
        leftLabel="DEM"
        rightLabel="GOP"
        leftValue={senateControl.dem}
        rightValue={senateControl.rep}
        leftColor={DEM}
        rightColor={REP}
        lastUpdated={senateControl.lastUpdated}
      />
      <MacroCard
        title="House Control"
        leftLabel="DEM"
        rightLabel="GOP"
        leftValue={houseControl.dem}
        rightValue={houseControl.rep}
        leftColor={DEM}
        rightColor={REP}
        lastUpdated={houseControl.lastUpdated}
      />
      <MacroCard
        title="Generic Ballot"
        leftLabel="DEM"
        rightLabel="GOP"
        leftValue={genericBallot.dem}
        rightValue={genericBallot.rep}
        leftColor={DEM}
        rightColor={REP}
        lastUpdated={genericBallot.lastUpdated}
      />
      <MacroCard
        title="Trump Approval"
        leftLabel="APPROVE"
        rightLabel="DISAPPROVE"
        leftValue={trumpApproval.approve}
        rightValue={trumpApproval.disapprove}
        leftColor={APPROVE}
        rightColor={DISAPPROVE}
        lastUpdated={trumpApproval.lastUpdated}
      />
    </div>
  );
}
