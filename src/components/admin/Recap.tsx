"use client";

import { useMemo, useState } from "react";
import type { Appointment } from "@/lib/types";
import { endOfMonthISO, endOfWeekISO, formatDateShort, startOfMonthISO, startOfWeekISO, todayISO } from "@/lib/time";

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

export function Recap({ appointments }: { appointments: Appointment[] }) {
  const [period, setPeriod] = useState<Period>("day");
  const [anchor, setAnchor] = useState(todayISO());

  const { start, end } = useMemo(() => rangeFor(period, anchor), [period, anchor]);

  const stats = useMemo(() => {
    const inRange = appointments.filter((a) => a.appt_date >= start && a.appt_date <= end);
    const set = inRange.length;
    const confirmed = inRange.filter((a) => a.confirmed_status === "yes").length;
    const showed = inRange.filter((a) => a.showed_status === "yes").length;
    const sold = inRange.filter((a) => a.sold_status === "yes").length;
    const closeRate = showed > 0 ? Math.round((sold / showed) * 100) : 0;
    return { set, confirmed, showed, sold, closeRate };
  }, [appointments, start, end]);

  const rangeLabel = period === "day" ? null : `${formatDateShort(start)} – ${formatDateShort(end)}`;

  return (
    <div className="pb-6 border-b border-[var(--border)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-headline text-lg">Recap</h2>
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
        </div>
      </div>

      {rangeLabel && <p className="text-xs text-[var(--foreground-muted)] mb-3 -mt-2">{rangeLabel}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="Set" value={stats.set} />
        <Stat label="Confirmed" value={stats.confirmed} />
        <Stat label="Showed" value={stats.showed} />
        <Stat label="Sold" value={stats.sold} />
        <Stat label="Close rate" value={`${stats.closeRate}%`} accent />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="field p-3 text-center">
      <div className={`text-2xl font-semibold tabular ${accent ? "text-[var(--accent)]" : ""}`}>{value}</div>
      <div className="text-xs text-[var(--foreground-muted)] mt-0.5">{label}</div>
    </div>
  );
}
