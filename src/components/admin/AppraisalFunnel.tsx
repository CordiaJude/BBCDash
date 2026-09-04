"use client";

import { useMemo, useState } from "react";
import type { Appointment, Rep, WorkflowStepRow } from "@/lib/types";
import { useAllWorkflowSteps } from "@/lib/useLiveData";
import { ALL_STEPS } from "@/lib/workflowSteps";
import {
  endOfMonthISO,
  endOfWeekISO,
  formatDateShort,
  startOfMonthISO,
  startOfWeekISO,
  todayISO,
} from "@/lib/time";

type Period = "day" | "week" | "month";

const PERIODS: { value: Period; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

function rangeFor(period: Period, anchorISO: string): { start: string; end: string } {
  const anchor = new Date(`${anchorISO}T00:00:00`);
  if (period === "week") return { start: startOfWeekISO(anchor), end: endOfWeekISO(anchor) };
  if (period === "month") return { start: startOfMonthISO(anchor), end: endOfMonthISO(anchor) };
  return { start: anchorISO, end: anchorISO };
}

function furthestStepOrder(steps: WorkflowStepRow[], appointmentId: string): number {
  let furthest = 0;
  for (let i = 0; i < ALL_STEPS.length; i++) {
    const done = steps.some((s) => s.appointment_id === appointmentId && s.step_key === ALL_STEPS[i].key && s.completed_at);
    if (done) furthest = i + 1;
  }
  return furthest;
}

function money(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function AppraisalFunnel({ appointments, reps }: { appointments: Appointment[]; reps: Rep[] }) {
  const { steps } = useAllWorkflowSteps();
  const [period, setPeriod] = useState<Period>("month");
  const [anchor, setAnchor] = useState(todayISO());
  const [repFilter, setRepFilter] = useState<string>("all");

  const { start, end } = useMemo(() => rangeFor(period, anchor), [period, anchor]);

  const inRange = useMemo(
    () =>
      appointments.filter(
        (a) => a.appt_date >= start && a.appt_date <= end && (repFilter === "all" || a.rep_id === repFilter)
      ),
    [appointments, start, end, repFilter]
  );

  // Only appointments that were actually run through the workflow have
  // step-level data — appointments sold via the old manual tri-state tap
  // are excluded here but still count in the basic recap stats.
  const withWorkflow = useMemo(() => inRange.filter((a) => a.workflow_status !== "not_started"), [inRange]);

  const funnelCounts = useMemo(() => {
    return ALL_STEPS.map((s, i) => {
      const count = withWorkflow.filter((a) => furthestStepOrder(steps, a.id) >= i + 1).length;
      return { step: s, count };
    });
  }, [withWorkflow, steps]);

  const maxCount = funnelCounts[0]?.count || 1;

  const exitReasons = useMemo(() => {
    const tally = new Map<string, number>();
    for (const a of withWorkflow) {
      if (a.workflow_status === "exited" && a.exit_reason) {
        tally.set(a.exit_reason, (tally.get(a.exit_reason) ?? 0) + 1);
      }
    }
    return Array.from(tally.entries()).sort((a, b) => b[1] - a[1]);
  }, [withWorkflow]);

  const biggestDropoff = useMemo(() => {
    let worst: { step: string; pct: number } | null = null;
    for (let i = 1; i < funnelCounts.length; i++) {
      const prev = funnelCounts[i - 1].count;
      if (prev === 0) continue;
      const drop = ((prev - funnelCounts[i].count) / prev) * 100;
      if (!worst || drop > worst.pct) worst = { step: funnelCounts[i].step.label, pct: Math.round(drop) };
    }
    return worst;
  }, [funnelCounts]);

  const spreadDeals = useMemo(
    () => inRange.filter((a) => a.asking_price != null && a.bought_price != null),
    [inRange]
  );
  const spreadByRep = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const a of spreadDeals) {
      const spread = (a.asking_price ?? 0) - (a.bought_price ?? 0);
      const key = a.rep_id ?? "unassigned";
      map.set(key, [...(map.get(key) ?? []), spread]);
    }
    return map;
  }, [spreadDeals]);
  const avgSpread =
    spreadDeals.length > 0
      ? spreadDeals.reduce((sum, a) => sum + ((a.asking_price ?? 0) - (a.bought_price ?? 0)), 0) / spreadDeals.length
      : null;

  const varianceDeals = useMemo(
    () =>
      inRange.filter(
        (a) => a.bought_price != null && (a.market_indicates_min != null || a.market_indicates_max != null)
      ),
    [inRange]
  );
  function marketMid(a: Appointment): number {
    if (a.market_indicates_min != null && a.market_indicates_max != null) return (a.market_indicates_min + a.market_indicates_max) / 2;
    return (a.market_indicates_min ?? a.market_indicates_max ?? 0) as number;
  }
  const varianceByRep = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const a of varianceDeals) {
      const variance = (a.bought_price ?? 0) - marketMid(a);
      const key = a.rep_id ?? "unassigned";
      map.set(key, [...(map.get(key) ?? []), variance]);
    }
    return map;
  }, [varianceDeals]);
  const avgVariance =
    varianceDeals.length > 0
      ? varianceDeals.reduce((sum, a) => sum + ((a.bought_price ?? 0) - marketMid(a)), 0) / varianceDeals.length
      : null;

  const gapBuckets = useMemo(() => {
    const buckets = { "≤ $500": [] as Appointment[], "$500–$1,500": [] as Appointment[], "$1,500+": [] as Appointment[] };
    for (const a of inRange) {
      if (a.asking_price == null || (a.market_indicates_min == null && a.market_indicates_max == null)) continue;
      const gap = Math.abs(a.asking_price - marketMid(a));
      if (gap <= 500) buckets["≤ $500"].push(a);
      else if (gap <= 1500) buckets["$500–$1,500"].push(a);
      else buckets["$1,500+"].push(a);
    }
    return buckets;
  }, [inRange]);

  function repName(id: string) {
    if (id === "unassigned") return "Unassigned";
    return reps.find((r) => r.id === id)?.display_name ?? "Unknown";
  }
  function avg(arr: number[]) {
    return arr.reduce((s, v) => s + v, 0) / arr.length;
  }

  return (
    <div className="pb-6 border-b border-[var(--border)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-headline text-lg">Appraisal Funnel</h2>
        <div className="flex items-center gap-2">
          <div className="flex field p-0.5 gap-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-2.5 py-1 rounded-[calc(var(--radius-md)-0.25rem)] text-xs font-medium transition-colors ${
                  period === p.value ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--hover-surface)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={anchor}
            onChange={(e) => setAnchor(e.target.value)}
            className="field px-3 py-1.5 text-sm tabular"
          />
          <select value={repFilter} onChange={(e) => setRepFilter(e.target.value)} className="field px-3 py-1.5 text-sm">
            <option value="all">All reps</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.display_name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-[var(--foreground-muted)] mb-4 -mt-2">
        {formatDateShort(start)} – {formatDateShort(end)} · {withWorkflow.length} appointment(s) run through the workflow
      </p>

      {biggestDropoff && (
        <p className="text-sm mb-4 field p-3">
          Biggest drop-off: <span className="font-semibold">{biggestDropoff.pct}%</span> of exits happen at{" "}
          <span className="font-semibold">{biggestDropoff.step}</span>.
        </p>
      )}

      {/* Drop-off funnel */}
      <div className="space-y-1.5 mb-6">
        {funnelCounts.map(({ step, count }) => (
          <div key={step.key} className="flex items-center gap-2">
            <span className="text-xs w-64 shrink-0 truncate text-[var(--foreground-muted)]">
              {step.phase === "mgm" ? "MGM" : "Appraisal"} {step.index} · {step.label}
            </span>
            <div className="field h-5 flex-1 p-0 overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] flex items-center justify-end pr-1.5 transition-all"
                style={{ width: `${maxCount ? Math.max((count / maxCount) * 100, count > 0 ? 4 : 0) : 0}%` }}
              >
                {count > 0 && <span className="text-[10px] text-white font-medium">{count}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Exit reasons */}
      <div className="mb-6">
        <h3 className="text-label mb-2">Exit reasons</h3>
        {exitReasons.length === 0 ? (
          <p className="text-sm text-[var(--foreground-muted)]">No exits in this range.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {exitReasons.map(([reason, count]) => (
              <div key={reason} className="field p-2.5 text-center">
                <div className="text-lg font-semibold tabular">{count}</div>
                <div className="text-xs text-[var(--foreground-muted)]">{reason}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spread + variance */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="text-label mb-2">Spread (asking − bought)</h3>
          <p className="text-sm mb-1.5">
            Dealership avg: <span className="font-semibold tabular">{avgSpread != null ? money(avgSpread) : "—"}</span>
          </p>
          <div className="space-y-1">
            {Array.from(spreadByRep.entries()).map(([id, values]) => (
              <div key={id} className="flex justify-between text-xs text-[var(--foreground-muted)]">
                <span>{repName(id)}</span>
                <span className="tabular">{money(avg(values))}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-label mb-2">Market variance (bought vs. comps)</h3>
          <p className="text-sm mb-1.5">
            Dealership avg: <span className="font-semibold tabular">{avgVariance != null ? money(avgVariance) : "—"}</span>
          </p>
          <div className="space-y-1">
            {Array.from(varianceByRep.entries()).map(([id, values]) => (
              <div key={id} className="flex justify-between text-xs text-[var(--foreground-muted)]">
                <span>{repName(id)}</span>
                <span className="tabular">{money(avg(values))}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Close rate by price gap */}
      <div>
        <h3 className="text-label mb-2">Close rate by price gap (asking vs. market)</h3>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(gapBuckets).map(([label, list]) => {
            const sold = list.filter((a) => a.sold_status === "yes").length;
            const rate = list.length > 0 ? Math.round((sold / list.length) * 100) : 0;
            return (
              <div key={label} className="field p-3 text-center">
                <div className="text-lg font-semibold tabular">{rate}%</div>
                <div className="text-xs text-[var(--foreground-muted)]">
                  {label} · {list.length} deal{list.length === 1 ? "" : "s"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
