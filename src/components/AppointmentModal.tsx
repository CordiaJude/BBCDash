"use client";

import { useEffect, useState } from "react";
import type { Appointment, CrmLabel, Rep, SessionUser } from "@/lib/types";
import { generateTimeSlots, todayISO } from "@/lib/time";

const TIME_SLOTS = generateTimeSlots();

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
  const [appraisalLink, setAppraisalLink] = useState(appointment?.appraisal_link ?? "");
  const [vautoLink, setVautoLink] = useState(appointment?.vauto_link ?? "");
  const [crmLink, setCrmLink] = useState(appointment?.crm_link ?? "");
  const [crmLabel, setCrmLabel] = useState<CrmLabel | "">(appointment?.crm_label ?? "");
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
      appraisal_link: appraisalLink || null,
      vauto_link: vautoLink || null,
      crm_link: crmLink || null,
      crm_label: crmLabel || null,
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
      onSaved();
    } catch {
      setError("Network error.");
      setSaving(false);
    }
  }

  async function remove() {
    if (!appointment || !isManager) return;
    if (!confirm(`Delete the appointment for ${appointment.customer_name}?`)) return;
    setSaving(true);
    const res = await fetch(`/api/appointments/${appointment.id}`, { method: "DELETE" });
    if (res.ok) {
      onDeleted?.();
    } else {
      setSaving(false);
      setError("Failed to delete.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-panel-strong w-full max-w-lg max-h-[90dvh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">{isEdit ? "Edit appointment" : "Add appointment"}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Customer name" className="sm:col-span-2">
            <input
              className="glass-input w-full px-3 py-2"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={!canEditAll}
              autoFocus
            />
          </Field>
          <Field label="Vehicle" className="sm:col-span-2">
            <input
              className="glass-input w-full px-3 py-2"
              placeholder="2024 Toyota Camry"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              disabled={!canEditAll}
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              className="glass-input w-full px-3 py-2 tabular"
              value={apptDate}
              onChange={(e) => setApptDate(e.target.value)}
              disabled={!canEditAll}
            />
          </Field>
          <Field label="Time">
            <select
              className="glass-input w-full px-3 py-2 tabular"
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
              <select className="glass-input w-full px-3 py-2" value={repId} onChange={(e) => setRepId(e.target.value)}>
                {reps.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.display_name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Appraisal link" className="sm:col-span-2">
            <input
              className="glass-input w-full px-3 py-2"
              placeholder="https://…"
              value={appraisalLink}
              onChange={(e) => setAppraisalLink(e.target.value)}
              disabled={!canEditAll}
            />
          </Field>
          <Field label="vAuto link" className="sm:col-span-2">
            <input
              className="glass-input w-full px-3 py-2"
              placeholder="https://…"
              value={vautoLink}
              onChange={(e) => setVautoLink(e.target.value)}
              disabled={!canEditAll}
            />
          </Field>
          <Field label="CRM">
            <select
              className="glass-input w-full px-3 py-2"
              value={crmLabel}
              onChange={(e) => setCrmLabel(e.target.value as CrmLabel | "")}
              disabled={!canEditAll}
            >
              <option value="">None</option>
              <option value="VAN">VAN</option>
              <option value="DealerCentric">DealerCentric</option>
            </select>
          </Field>
          <Field label="CRM link">
            <input
              className="glass-input w-full px-3 py-2"
              placeholder="https://…"
              value={crmLink}
              onChange={(e) => setCrmLink(e.target.value)}
              disabled={!canEditAll}
            />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea
              className="glass-input w-full px-3 py-2 min-h-20"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canEditAll}
            />
          </Field>
        </div>

        {error && <p className="text-sm text-[#e0654f] mt-3">{error}</p>}

        <div className="flex items-center justify-between mt-5">
          <div>
            {isEdit && isManager && (
              <button
                onClick={remove}
                disabled={saving}
                className="text-sm text-[#e0654f] hover:underline disabled:opacity-50"
              >
                Delete appointment
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="glass-input px-4 py-2 text-sm hover:bg-white/10">
              Cancel
            </button>
            {canEditAll && (
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-xl font-medium bg-[var(--accent)] text-white hover:brightness-110 disabled:opacity-60 transition"
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
