"use client";

import { useMemo, useState } from "react";
import { useAppointments, useReps, useTvSettings } from "@/lib/useLiveData";
import { useNowTick } from "@/lib/useNowTick";
import { useAlertScheduler } from "@/lib/useAlertScheduler";
import { unlockAudio } from "@/lib/sounds";
import { endOfWeekISO, formatDateShort, todayISO } from "@/lib/time";
import type { Appointment } from "@/lib/types";
import { AppointmentCard } from "../AppointmentCard";

function isComplete(a: Appointment) {
  return a.confirmed_status !== "pending" && a.showed_status !== "pending" && a.sold_status !== "pending";
}

const STATUS_COLUMNS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "confirmed", label: "Confirmed" },
  { key: "showed", label: "Showed" },
  { key: "sold", label: "Sold" },
] as const;

function statusBucket(a: Appointment): (typeof STATUS_COLUMNS)[number]["key"] {
  if (a.sold_status === "yes") return "sold";
  if (a.showed_status === "yes") return "showed";
  if (a.confirmed_status === "yes") return "confirmed";
  return "upcoming";
}

export function TvBoard() {
  const { appointments, loaded } = useAppointments();
  const reps = useReps();
  const settings = useTvSettings();
  const now = useNowTick(20000);
  const [soundUnlocked, setSoundUnlocked] = useState(false);

  const repMap = useMemo(() => new Map(reps.map((r) => [r.id, r])), [reps]);

  const weekAppts = useMemo(() => {
    // Recomputed on every `now` tick (not just when appointments change) so that
    // completed/past-day appointments actually drop off at midnight rollover,
    // rather than only when new realtime data happens to arrive.
    const today = todayISO();
    const end = endOfWeekISO(now);
    return appointments.filter((a) => a.appt_date >= today && a.appt_date <= end);
  }, [appointments, now]);

  useAlertScheduler(weekAppts, settings, soundUnlocked);

  const sorted = useMemo(() => {
    return weekAppts.slice().sort((a, b) => {
      const ac = isComplete(a) ? 1 : 0;
      const bc = isComplete(b) ? 1 : 0;
      if (ac !== bc) return ac - bc;
      return (a.appt_date + a.appt_time).localeCompare(b.appt_date + b.appt_time);
    });
  }, [weekAppts]);

  async function enableSound() {
    await unlockAudio();
    setSoundUnlocked(true);
  }

  const layout = settings?.layout_mode ?? "single_list";

  return (
    <div className="min-h-dvh p-4 sm:p-6">
      {settings?.alerts_enabled && !soundUnlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <button
            onClick={enableSound}
            className="glass-panel-strong px-8 py-6 text-lg font-medium hover:bg-white/10 transition"
          >
            🔊 Tap to enable sound alerts
          </button>
        </div>
      )}

      <div className="glass-panel px-5 py-3 mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Appointment Board</h1>
        <span className="tabular text-sm text-[var(--foreground-muted)]">
          {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} ·{" "}
          {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>

      {!loaded && <p className="text-[var(--foreground-muted)]">Loading…</p>}

      {layout === "single_list" && (
        <div className="space-y-2.5 max-w-4xl mx-auto">
          {sorted.map((a) => (
            <div key={a.id}>
              <div className="text-[10px] uppercase tracking-wide text-[var(--foreground-muted)] mb-0.5 ml-1">
                {formatDateShort(a.appt_date)}
              </div>
              <AppointmentCard appt={a} rep={repMap.get(a.rep_id)} now={now} editable={false} />
            </div>
          ))}
          {loaded && sorted.length === 0 && (
            <p className="text-center text-[var(--foreground-muted)] py-16">No appointments this week.</p>
          )}
        </div>
      )}

      {layout === "columns_per_rep" && (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(reps.length, 1)}, minmax(240px, 1fr))` }}>
          {reps
            .filter((r) => r.active)
            .map((r) => (
              <div key={r.id}>
                <div className="glass-input px-3 py-2 mb-2 text-sm font-medium flex items-center gap-2" style={{ borderLeft: `3px solid ${r.color_hex}` }}>
                  {r.display_name}
                </div>
                <div className="space-y-2.5">
                  {sorted
                    .filter((a) => a.rep_id === r.id)
                    .map((a) => (
                      <AppointmentCard key={a.id} appt={a} rep={r} now={now} editable={false} compact />
                    ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {layout === "columns_by_status" && (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4, minmax(240px, 1fr))" }}>
          {STATUS_COLUMNS.map((col) => (
            <div key={col.key}>
              <div className="glass-input px-3 py-2 mb-2 text-sm font-medium text-center">{col.label}</div>
              <div className="space-y-2.5">
                {sorted
                  .filter((a) => statusBucket(a) === col.key)
                  .map((a) => (
                    <AppointmentCard key={a.id} appt={a} rep={repMap.get(a.rep_id)} now={now} editable={false} compact />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
