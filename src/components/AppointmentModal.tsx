"use client";

import { useEffect, useState } from "react";
import type { Appointment, Rep, SessionUser } from "@/lib/types";
import { generateTimeSlots, todayISO } from "@/lib/time";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

const TIME_SLOTS = generateTimeSlots();
const CLOSE_ANIM_MS = 180;

export function AppointmentModal({
  user,
  reps,
  appointment,
  onClose,
  onSaved,
  onDeleted,
}: {
  user: SessionUser;
  reps: Rep[];
  appointment: Appointment | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const isManager = user.role === "manager";
  const isEdit = !!appointment;
  const [customerName, setCustomerName] = useState(appointment?.customer_name ?? "");
  const [vehicle, setVehicle] = useState(appointment?.vehicle ?? "");
  const [apptDate, setApptDate] = useState(appointment?.appt_date ?? todayISO());
  const [apptTime, setApptTime] = useState(appointment?.appt_time ?? "09:00:00");
  const [repId, setRepId] = useState(appointment?.rep_id ?? user.id);
  const [vautoLink, setVautoLink] = useState(appointment?.vauto_link ?? "");
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  // Subtle scale+fade exit: run the CSS exit animation, then actually
  // unmount (via the caller-supplied callback) once it's finished.
  function requestClose(cb: () => void) {
    if (reducedMotion) {
      cb();
      return;
    }
    setClosing(true);
    setTimeout(cb, CLOSE_ANIM_MS);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose(onClose);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  const canEditAll = isManager || !isEdit || appointment?.rep_id === user.id;

  async function save() {
    if (!customerName.trim() || !vehicle.trim()) {
      setError("Customer name and vehicle are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      customer_name: customerName,
      vehicle,
      appt_date: apptDate,
      appt_time: apptTime,
      rep_id: isManager ? repId : undefined,
      vauto_link: vautoLink || null,
      notes: notes || null,
    };
    try {
      const res = await fetch(isEdit ? `/api/appointments/${appointment!.id}` : "/api/appointments", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save.");
        setSaving(false);
        return;
      }
      requestClose(onSaved);
    } catch {
      setError("Network error.");
      setSaving(false);
    }
  }

  async function remove() {
    if (!appointment || !isManager) return;
    if (
      !confirm(
        `Delete the appointment for ${appointment.customer_name}? It can be restored from Admin → Recently deleted for 7 days.`
      )
    )
      return;
    setSaving(true);
    const res = await fetch(`/api/appointments/${appointment.id}`, { method: "DELETE" });
    if (res.ok) {
      if (onDeleted) requestClose(onDeleted);
    } else {
      setSaving(false);
      setError("Failed to delete.");
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 ${
        closing ? "modal-backdrop-out" : "modal-backdrop-in"
      }`}
      onClick={() => requestClose(onClose)}
    >
      <div
        className={`panel-strong w-full max-w-lg max-h-[90dvh] overflow-y-auto p-6 ${
          closing ? "modal-panel-out" : "modal-panel-in"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">{isEdit ? "Edit appointment" : "Add appointment"}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Customer name" className="sm:col-span-2">
            <input
              className="field w-full px-3 py-2"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={!canEditAll}
              autoFocus
            />
          </Field>
          <Field label="Vehicle" className="sm:col-span-2">
            <input
              className="field w-full px-3 py-2"
              placeholder="2024 Toyota Camry"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              disabled={!canEditAll}
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              className="field w-full px-3 py-2 tabular"
              value={apptDate}
              onChange={(e) => setApptDate(e.target.value)}
              disabled={!canEditAll}
            />
          </Field>
          <Field label="Time">
            <select
              className="field w-full px-3 py-2 tabular"
              value={apptTime}
              onChange={(e) => setApptTime(e.target.value)}
              disabled={!canEditAll}
            >
              {TIME_SLOTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>

          {isManager && (
            <Field label="Assigned rep" className="sm:col-span-2">
              <select className="field w-full px-3 py-2" value={repId} onChange={(e) => setRepId(e.target.value)}>
                {reps.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.display_name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="vAuto link" className="sm:col-span-2">
            <input
              className="field w-full px-3 py-2"
              placeholder="https://…"
              value={vautoLink}
              onChange={(e) => setVautoLink(e.target.value)}
              disabled={!canEditAll}
            />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea
              className="field w-full px-3 py-2 min-h-20"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canEditAll}
            />
          </Field>
        </div>

        {error && <p className="text-sm text-[var(--bad)] mt-3">{error}</p>}

        <div className="flex items-center justify-between mt-5">
          <div>
            {isEdit && isManager && (
              <button
                onClick={remove}
                disabled={saving}
                className="text-sm text-[var(--bad)] hover:underline disabled:opacity-50"
              >
                Delete appointment
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => requestClose(onClose)}
              className="field px-4 py-2 text-sm hover:bg-[var(--hover-surface-strong)]"
            >
              Cancel
            </button>
            {canEditAll && (
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-2xl font-medium bg-[var(--accent)] text-white hover:brightness-110 disabled:opacity-60 transition"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block text-xs uppercase tracking-wide text-[var(--foreground-muted)] mb-1">{label}</span>
      {children}
    </label>
  );
}
