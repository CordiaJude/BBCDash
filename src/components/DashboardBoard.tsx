"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Appointment, SessionUser, TriState } from "@/lib/types";
import { useAppointments, useReps } from "@/lib/useLiveData";
import { useNowTick } from "@/lib/useNowTick";
import { AppointmentCard } from "./AppointmentCard";
import { AppointmentModal } from "./AppointmentModal";
import { formatDateShort, todayISO } from "@/lib/time";

function isComplete(a: Appointment) {
  return a.confirmed_status !== "pending" && a.showed_status !== "pending" && a.sold_status !== "pending";
}

export function DashboardBoard({ user }: { user: SessionUser }) {
  const { appointments, loaded } = useAppointments();
  const reps = useReps();
  const now = useNowTick();
  const [scope, setScope] = useState<"mine" | "everyone">("mine");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [shimmerIds, setShimmerIds] = useState<Set<string>>(new Set());

  const prevCompleteRef = useRef<Map<string, boolean>>(new Map());
  useEffect(() => {
    const prev = prevCompleteRef.current;
    const newlyDone: string[] = [];
    for (const a of appointments) {
      const done = isComplete(a);
      if (done && prev.get(a.id) === false) newlyDone.push(a.id);
      prev.set(a.id, done);
    }
    if (newlyDone.length) {
      const start = setTimeout(() => setShimmerIds((s) => new Set([...s, ...newlyDone])), 0);
      const end = setTimeout(() => {
        setShimmerIds((s) => {
          const next = new Set(s);
          newlyDone.forEach((id) => next.delete(id));
          return next;
        });
      }, 950);
      return () => {
        clearTimeout(start);
        clearTimeout(end);
      };
    }
  }, [appointments]);

  const repMap = useMemo(() => new Map(reps.map((r) => [r.id, r])), [reps]);

  const today = todayISO();
  const visible = useMemo(() => {
    return appointments.filter((a) => (scope === "mine" ? a.rep_id === user.id : true));
  }, [appointments, scope, user.id]);

  const conflictKeys = useMemo(() => {
    // A conflict is the SAME rep double-booked at the same date+time —
    // not merely two different reps each having their own appointment then.
    const counts = new Map<string, number>();
    for (const a of appointments) {
      const key = `${a.rep_id}|${a.appt_date}|${a.appt_time}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const conflicted = new Set<string>();
    for (const [key, count] of counts) if (count > 1) conflicted.add(key);
    return conflicted;
  }, [appointments]);

  const active = visible.filter((a) => !isComplete(a) || a.appt_date !== today);
  const completedToday = visible.filter((a) => isComplete(a) && a.appt_date === today);

  async function setStatus(appt: Appointment, field: "confirmed_status" | "showed_status" | "sold_status", value: TriState) {
    await fetch(`/api/appointments/${appt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  }

  function openEdit(appt: Appointment) {
    setEditing(appt);
    setModalOpen(true);
  }

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="glass-input inline-flex p-1 gap-1">
          <button
            onClick={() => setScope("mine")}
            className={`px-3 py-1.5 rounded-2xl text-sm font-medium transition-colors ${
              scope === "mine" ? "bg-[var(--hover-tint-strong)]" : "text-[var(--foreground-muted)] hover:bg-[var(--hover-tint)]"
            }`}
          >
            My appointments
          </button>
          <button
            onClick={() => setScope("everyone")}
            className={`px-3 py-1.5 rounded-2xl text-sm font-medium transition-colors ${
              scope === "everyone" ? "bg-[var(--hover-tint-strong)]" : "text-[var(--foreground-muted)] hover:bg-[var(--hover-tint)]"
            }`}
          >
            Everyone
          </button>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 rounded-2xl text-sm font-medium bg-[var(--accent)] text-white hover:brightness-110 transition"
        >
          + Add appointment
        </button>
      </div>

      {!loaded && <p className="text-sm text-[var(--foreground-muted)]">Loading…</p>}

      <div className="space-y-2.5">
        {active
          .slice()
          .sort((a, b) => (a.appt_date + a.appt_time).localeCompare(b.appt_date + b.appt_time))
          .map((a) => (
            <div key={a.id}>
              {scope === "everyone" && (
                <div className="text-[10px] uppercase tracking-wide text-[var(--foreground-muted)] mb-0.5 ml-1">
                  {formatDateShort(a.appt_date)}
                </div>
              )}
              <AppointmentCard
                appt={a}
                rep={repMap.get(a.rep_id)}
                now={now}
                editable={user.role === "manager" || a.rep_id === user.id}
                onStatusChange={(field, v) => setStatus(a, field, v)}
                onClick={() => openEdit(a)}
                hasConflict={conflictKeys.has(`${a.rep_id}|${a.appt_date}|${a.appt_time}`)}
                shimmer={shimmerIds.has(a.id)}
              />
            </div>
          ))}
        {loaded && active.length === 0 && (
          <p className="text-sm text-[var(--foreground-muted)] py-8 text-center">No appointments here yet.</p>
        )}
      </div>

      {completedToday.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xs uppercase tracking-wide text-[var(--foreground-muted)] mb-2">Completed today</h3>
          <div className="space-y-2.5 opacity-80">
            {completedToday.map((a) => (
              <AppointmentCard
                key={a.id}
                appt={a}
                rep={repMap.get(a.rep_id)}
                now={now}
                compact
                editable={user.role === "manager" || a.rep_id === user.id}
                onStatusChange={(field, v) => setStatus(a, field, v)}
                onClick={() => openEdit(a)}
              />
            ))}
          </div>
        </div>
      )}

      {modalOpen && (
        <AppointmentModal
          user={user}
          reps={reps}
          appointment={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => setModalOpen(false)}
          onDeleted={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
