"use client";

import { useMemo, useState } from "react";
import type { Appointment, Rep, SessionUser } from "@/lib/types";
import { CustomerDetailModal } from "./CustomerDetailModal";
import { WorkflowModal } from "../WorkflowModal";
import { useDealershipSettings } from "@/lib/useLiveData";
import { CollapsibleSection } from "./CollapsibleSection";
import {
  endOfMonthISO,
  endOfWeekISO,
  formatDateShort,
  formatTime12h,
  startOfMonthISO,
  startOfWeekISO,
  todayISO,
} from "@/lib/time";

type Period = "day" | "week" | "month";
type Category = "set" | "confirmed" | "showed" | "sold";

const PERIODS: { value: Period; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const CATEGORY_LABEL: Record<Category, string> = {
  set: "Set",
  confirmed: "Confirmed",
  showed: "Showed",
  sold: "Sold",
};

function matchesCategory(a: Appointment, category: Category): boolean {
  if (category === "set") return true;
  if (category === "confirmed") return a.confirmed_status === "yes";
  if (category === "showed") return a.showed_status === "yes";
  return a.sold_status === "yes";
}

function rangeFor(period: Period, anchorISO: string): { start: string; end: string } {
  const anchor = new Date(`${anchorISO}T00:00:00`);
  if (period === "week") return { start: startOfWeekISO(anchor), end: endOfWeekISO(anchor) };
  if (period === "month") return { start: startOfMonthISO(anchor), end: endOfMonthISO(anchor) };
  return { start: anchorISO, end: anchorISO };
}

export function Recap({ appointments, reps, user }: { appointments: Appointment[]; reps: Rep[]; user: SessionUser }) {
  const [period, setPeriod] = useState<Period>("day");
  const [anchor, setAnchor] = useState(todayISO());
  const [drilldown, setDrilldown] = useState<Category | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [workflowAppt, setWorkflowAppt] = useState<Appointment | null>(null);
  const dealershipSettings = useDealershipSettings();

  const { start, end } = useMemo(() => rangeFor(period, anchor), [period, anchor]);

  const inRange = useMemo(
    () => appointments.filter((a) => a.appt_date >= start && a.appt_date <= end),
    [appointments, start, end]
  );

  const stats = useMemo(() => {
    const set = inRange.length;
    const confirmed = inRange.filter((a) => a.confirmed_status === "yes").length;
    const showed = inRange.filter((a) => a.showed_status === "yes").length;
    const sold = inRange.filter((a) => a.sold_status === "yes").length;
    const closeRate = showed > 0 ? Math.round((sold / showed) * 100) : 0;
    return { set, confirmed, showed, sold, closeRate };
  }, [inRange]);

  const drilldownList = useMemo(() => {
    if (!drilldown) return [];
    return inRange
      .filter((a) => matchesCategory(a, drilldown))
      .slice()
      .sort((a, b) => (a.appt_date + a.appt_time).localeCompare(b.appt_date + b.appt_time));
  }, [inRange, drilldown]);

  const rangeLabel = period === "day" ? null : `${formatDateShort(start)} – ${formatDateShort(end)}`;

  function toggle(category: Category) {
    setDrilldown((c) => (c === category ? null : category));
  }

  const controls = (
    <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex field p-0.5 gap-0.5">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => {
              setPeriod(p.value);
              setDrilldown(null);
            }}
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
        onChange={(e) => {
          setAnchor(e.target.value);
          setDrilldown(null);
        }}
        className="field px-3 py-1.5 text-sm tabular"
      />
    </div>
  );

  return (
    <CollapsibleSection title="Recap" right={controls}>
      {rangeLabel && <p className="text-xs text-[var(--foreground-muted)] mb-3 -mt-1">{rangeLabel}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="Set" value={stats.set} active={drilldown === "set"} onClick={() => toggle("set")} />
        <Stat
          label="Confirmed"
          value={stats.confirmed}
          active={drilldown === "confirmed"}
          onClick={() => toggle("confirmed")}
        />
        <Stat label="Showed" value={stats.showed} active={drilldown === "showed"} onClick={() => toggle("showed")} />
        <Stat label="Sold" value={stats.sold} active={drilldown === "sold"} onClick={() => toggle("sold")} />
        <Stat label="Close rate" value={`${stats.closeRate}%`} accent />
      </div>

      {drilldown && (
        <div className="field mt-3 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wide text-[var(--foreground-muted)]">
              {CATEGORY_LABEL[drilldown]} · {drilldownList.length} appointment{drilldownList.length === 1 ? "" : "s"}
            </p>
            <button
              onClick={() => setDrilldown(null)}
              className="text-xs text-[var(--foreground-faint)] hover:text-[var(--foreground)]"
            >
              Close
            </button>
          </div>
          {drilldownList.length === 0 ? (
            <p className="text-sm text-[var(--foreground-muted)] py-2">Nothing here for this period.</p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {drilldownList.map((a) => {
                const rep = reps.find((r) => r.id === a.rep_id);
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelected(a)}
                    className="w-full flex items-center justify-between gap-3 py-1.5 border-b border-[var(--border)] last:border-none text-left hover-surface rounded-[var(--radius-md)] px-1.5 -mx-1.5"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{a.customer_name}</div>
                      <div className="text-xs text-[var(--foreground-faint)] truncate">
                        {a.vehicle} · With {rep?.display_name ?? "Unassigned"}
                      </div>
                    </div>
                    <div className="text-xs text-[var(--foreground-muted)] tabular shrink-0">
                      {formatDateShort(a.appt_date)} · {formatTime12h(a.appt_time)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selected && (
        <CustomerDetailModal
          appointment={selected}
          rep={reps.find((r) => r.id === selected.rep_id)}
          onClose={() => setSelected(null)}
          onViewWorkflow={() => {
            setWorkflowAppt(selected);
            setSelected(null);
          }}
        />
      )}

      {workflowAppt && (
        <WorkflowModal
          user={user}
          appointment={workflowAppt}
          dealershipSettings={dealershipSettings}
          onClose={() => setWorkflowAppt(null)}
        />
      )}
    </CollapsibleSection>
  );
}

function Stat({
  label,
  value,
  accent,
  active,
  onClick,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`field p-3 text-center transition-colors ${onClick ? "cursor-pointer hover:bg-[var(--hover-surface)]" : ""} ${
        active ? "ring-1 ring-[var(--accent)]/60 bg-[var(--hover-surface)]" : ""
      }`}
    >
      <div className={`text-2xl font-semibold tabular ${accent ? "text-[var(--accent)]" : ""}`}>{value}</div>
      <div className="text-xs text-[var(--foreground-muted)] mt-0.5">{label}</div>
    </Tag>
  );
}
