import { useEffect, useState } from "react";
import { genericBallot, trumpApproval } from "../mocks/macroMetrics";
import { formatUpdated } from "../lib/format";
import { fetchControl, sourceHasData } from "../lib/api";
import OverlapBar, { overlapInfo } from "./OverlapBar";

const DEM = "#2563eb";
const REP = "#dc2626";
const APPROVE = "#16a34a";
const DISAPPROVE = "#dc2626";

// ---- shared bits --------------------------------------------------------

function CardShell({ title, badge, children }) {
  return (
    <div className="flex min-h-[168px] flex-col gap-3 rounded-xl border border-ops-border bg-ops-panel/80 p-4 backdrop-blur-sm sm:p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ops-muted">
          {title}
        </h3>
        {badge}
      </div>
      {children}
    </div>
  );
}

function LeadBadge({ leftLabel, rightLabel, leftValue, rightValue, leftColor, rightColor }) {
  const leftLeads = leftValue >= rightValue;
  const color = leftLeads ? leftColor : rightColor;
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ color, backgroundColor: `${color}1a` }}
    >
      {leftLeads ? leftLabel : rightLabel} +{Math.round(Math.abs(leftValue - rightValue) * 10) / 10}
    </span>
  );
}

function NumberRow({ leftLabel, rightLabel, leftValue, rightValue, leftColor, rightColor }) {
  return (
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

// ---- poll card (generic ballot, approval) — single source, sums to 100 --

function SplitBar({ leftPct, rightPct, leftColor, rightColor }) {
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-ops-border">
      <div className="h-full transition-all duration-500" style={{ width: `${leftPct}%`, backgroundColor: leftColor }} />
      <div className="ml-auto h-full transition-all duration-500" style={{ width: `${rightPct}%`, backgroundColor: rightColor }} />
    </div>
  );
}

function PollCard({ title, leftLabel, rightLabel, leftValue, rightValue, leftColor, rightColor, lastUpdated }) {
  return (
    <CardShell
      title={title}
      badge={
        <LeadBadge
          leftLabel={leftLabel}
          rightLabel={rightLabel}
          leftValue={leftValue}
          rightValue={rightValue}
          leftColor={leftColor}
          rightColor={rightColor}
        />
      }
    >
      <NumberRow
        leftLabel={leftLabel}
        rightLabel={rightLabel}
        leftValue={leftValue}
        rightValue={rightValue}
        leftColor={leftColor}
        rightColor={rightColor}
      />
      <SplitBar leftPct={leftValue} rightPct={rightValue} leftColor={leftColor} rightColor={rightColor} />
      <div className="mt-auto flex items-center justify-end pt-1">
        <p className="text-[10px] uppercase tracking-wide text-ops-muted/70">
          Updated {formatUpdated(lastUpdated)}
        </p>
      </div>
    </CardShell>
  );
}

// ---- market control card (Senate / House) — two-sided, multi-source -----

function MarketControlCard({ title, status, data }) {
  const [index, setIndex] = useState(0);
  const sources = data?.sources || [];
  const current = sources[index] || null;
  const multi = sources.length > 1;
  const hasData = sourceHasData(current);
  const band = hasData ? overlapInfo(current.demYes, current.repYes) : null;

  return (
    <CardShell
      title={title}
      badge={
        hasData ? (
          <LeadBadge
            leftLabel="DEM"
            rightLabel="GOP"
            leftValue={current.demYes}
            rightValue={current.repYes}
            leftColor={DEM}
            rightColor={REP}
          />
        ) : null
      }
    >
      {status === "loading" && (
        <div className="flex flex-1 flex-col justify-center gap-3">
          <div className="h-7 w-2/3 animate-pulse rounded bg-ops-border" />
          <div className="h-2.5 w-full animate-pulse rounded-full bg-ops-border" />
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-1 items-center text-xs text-ops-muted">
          Couldn’t load market data.
        </div>
      )}

      {status === "ok" && (
        hasData ? (
          <>
            <NumberRow
              leftLabel="DEM"
              rightLabel="GOP"
              leftValue={current.demYes}
              rightValue={current.repYes}
              leftColor={DEM}
              rightColor={REP}
            />
            <OverlapBar demYes={current.demYes} repYes={current.repYes} />
            <div className="flex h-3 items-center">
              {band && (
                <span className="text-[10px] font-medium tracking-wide" style={{ color: band.color }}>
                  {band.text}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-ops-border bg-ops-panel-2/40 px-3 py-4 text-center text-xs text-ops-muted">
            No {current?.label || "source"} market yet
          </div>
        )
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {multi ? (
          <SourceSwitcher
            source={current?.label}
            onPrev={() => setIndex((i) => (i - 1 + sources.length) % sources.length)}
            onNext={() => setIndex((i) => (i + 1) % sources.length)}
          />
        ) : (
          <span />
        )}
        <p className="text-[10px] uppercase tracking-wide text-ops-muted/70">
          Updated {formatUpdated(current?.lastUpdated)}
        </p>
      </div>
    </CardShell>
  );
}

// ---- container ----------------------------------------------------------

export default function MacroMetrics() {
  const [control, setControl] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | error

  useEffect(() => {
    let alive = true;
    fetchControl()
      .then((d) => alive && (setControl(d), setStatus("ok")))
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MarketControlCard title="Senate Control" status={status} data={control?.senate} />
      <MarketControlCard title="House Control" status={status} data={control?.house} />
      <PollCard
        title="Generic Ballot"
        leftLabel="DEM"
        rightLabel="GOP"
        leftValue={genericBallot.dem}
        rightValue={genericBallot.rep}
        leftColor={DEM}
        rightColor={REP}
        lastUpdated={genericBallot.lastUpdated}
      />
      <PollCard
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
