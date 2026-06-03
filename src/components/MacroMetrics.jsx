import { useState } from "react";
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

function Chevron({ dir }) {
  const d = dir === "left" ? "M11 4L6 8l5 4" : "M5 4l5 4-5 4";
  return (
    <svg width="14" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Inline source switcher: ‹ label ›. Buttons are accent-colored on hover.
function SourceSwitcher({ source, onPrev, onNext }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-ops-border bg-ops-panel-2/60 px-1 py-0.5">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous source"
        className="rounded-full p-0.5 text-ops-muted transition-colors hover:text-accent"
      >
        <Chevron dir="left" />
      </button>
      <span className="min-w-[68px] text-center text-[11px] font-semibold text-ops-text">
        {source}
      </span>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next source"
        className="rounded-full p-0.5 text-ops-muted transition-colors hover:text-accent"
      >
        <Chevron dir="right" />
      </button>
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
  // Optional multi-source controls; omitted for single-source cards.
  source,
  onPrev,
  onNext,
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

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {source ? (
          <SourceSwitcher source={source} onPrev={onPrev} onNext={onNext} />
        ) : (
          <span />
        )}
        <p className="text-[10px] uppercase tracking-wide text-ops-muted/70">
          Updated {formatUpdated(lastUpdated)}
        </p>
      </div>
    </div>
  );
}

// Wraps MacroCard with source-cycling state for multi-source control markets.
function MarketCard({ title, data, leftLabel, rightLabel }) {
  const sources = data.sources;
  const [index, setIndex] = useState(0);
  const current = sources[index];
  const multi = sources.length > 1;

  return (
    <MacroCard
      title={title}
      leftLabel={leftLabel}
      rightLabel={rightLabel}
      leftValue={current.dem}
      rightValue={current.rep}
      leftColor={DEM}
      rightColor={REP}
      lastUpdated={current.lastUpdated}
      source={current.label}
      onPrev={multi ? () => setIndex((i) => (i - 1 + sources.length) % sources.length) : undefined}
      onNext={multi ? () => setIndex((i) => (i + 1) % sources.length) : undefined}
    />
  );
}

export default function MacroMetrics() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MarketCard title="Senate Control" data={senateControl} leftLabel="DEM" rightLabel="GOP" />
      <MarketCard title="House Control" data={houseControl} leftLabel="DEM" rightLabel="GOP" />
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
