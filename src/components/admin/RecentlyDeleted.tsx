"use client";

import { useEffect, useState } from "react";
import { useDeletedAppointments } from "@/lib/useLiveData";
import { formatDateShort, formatTime12h } from "@/lib/time";
import type { Rep } from "@/lib/types";
import { CollapsibleSection } from "./CollapsibleSection";

const RETENTION_DAYS = 7;

function daysLeft(deletedAt: string): number {
  const purgeAt = new Date(deletedAt).getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgeAt - Date.now()) / (24 * 60 * 60 * 1000)));
}

export function RecentlyDeleted({ reps }: { reps: Rep[] }) {
  const { appointments } = useDeletedAppointments();
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Sweep anything past its 7-day window whenever this panel is opened —
  // there's no background job doing this (no pg_cron), so expired rows
  // are cleaned up on next view instead of by a timer.
  useEffect(() => {
    fetch("/api/appointments/purge-expired", { method: "POST" });
  }, []);

  async function restore(id: string) {
    setRestoringId(id);
    await fetch(`/api/appointments/${id}/restore`, { method: "POST" });
    setRestoringId(null);
  }

  if (appointments.length === 0) return null;

  return (
    <CollapsibleSection title={`Recently deleted (${appointments.length})`} defaultOpen={false}>
      <p className="text-xs text-[var(--foreground-muted)] mb-4 -mt-1">
        Kept for 7 days after deletion, then removed for good.
      </p>
      <div className="space-y-2">
        {appointments.map((a) => {
          const rep = reps.find((r) => r.id === a.rep_id);
          const left = a.deleted_at ? daysLeft(a.deleted_at) : 0;
          return (
            <div key={a.id} className="field flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {a.customer_name} <span className="text-[var(--foreground-muted)] font-normal">· {a.vehicle}</span>
                </div>
                <div className="text-xs text-[var(--foreground-faint)] tabular">
                  {formatDateShort(a.appt_date)} at {formatTime12h(a.appt_time)} · With {rep?.display_name ?? "Unassigned"}
                  {" · "}
                  {left > 0 ? `${left} day${left === 1 ? "" : "s"} left` : "purging soon"}
                </div>
              </div>
              <button
                onClick={() => restore(a.id)}
                disabled={restoringId === a.id}
                className="field px-3 py-1.5 text-xs hover:bg-[var(--hover-surface-strong)] disabled:opacity-50 shrink-0"
              >
                {restoringId === a.id ? "Restoring…" : "Restore"}
              </button>
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}
