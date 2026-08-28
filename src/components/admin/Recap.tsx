"use client";

import { useMemo, useState } from "react";
import type { Appointment } from "@/lib/types";
import { todayISO } from "@/lib/time";

export function Recap({ appointments }: { appointments: Appointment[] }) {
  const [date, setDate] = useState(todayISO());

  const stats = useMemo(() => {
    const day = appointments.filter((a) => a.appt_date === date);
    const set = day.length;
    const confirmed = day.filter((a) => a.confirmed_status === "yes").length;
    const showed = day.filter((a) => a.showed_status === "yes").length;
    const sold = day.filter((a) => a.sold_status === "yes").length;
    const closeRate = showed > 0 ? Math.round((sold / showed) * 100) : 0;
    return { set, confirmed, showed, sold, closeRate };
  }, [appointments, date]);

  return (
    <div className="glass-panel p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">Recap</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="glass-input px-3 py-1.5 text-sm tabular"
        />
      </div>
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
    <div className="glass-input p-3 text-center">
      <div className={`text-2xl font-semibold tabular ${accent ? "text-[var(--accent)]" : ""}`}>{value}</div>
      <div className="text-xs text-[var(--foreground-muted)] mt-0.5">{label}</div>
    </div>
  );
}
