"use client";

import type { Appointment, Rep, TriState } from "@/lib/types";
import { RepAvatar } from "../RepAvatar";
import { formatDateShort, formatTime12h } from "@/lib/time";

/** Small read-only status pill — not the clickable StatusToggle used in edit contexts. */
function StatusPill({ label, value }: { label: string; value: TriState }) {
  const style =
    value === "yes"
      ? { bg: "var(--ok)", fg: "var(--ok-icon)" }
      : value === "no"
        ? { bg: "transparent", fg: "var(--bad)" }
        : { bg: "transparent", fg: "var(--pending-outline)" };
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="status-circle"
        style={{
          background: style.bg,
          color: style.fg,
          boxShadow: value === "yes" ? "none" : `0 0 0 1.5px ${style.fg} inset`,
        }}
      >
        {value === "yes" && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {value === "no" && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <span className="text-label">{label}</span>
    </div>
  );
}

/**
 * Clean, read-only customer summary — deliberately NOT the AppointmentModal
 * add/edit form. Opened from the Recap drilldown list so a manager can look
 * at a customer's appointment without it looking like a data-entry screen.
 */
export function CustomerDetailModal({
  appointment,
  rep,
  onClose,
}: {
  appointment: Appointment;
  rep: Rep | undefined;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 modal-backdrop-in" onClick={onClose}>
      <div
        className="panel-strong w-full max-w-md p-6 modal-panel-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h2 className="text-headline text-2xl truncate">{appointment.customer_name}</h2>
            <p className="text-secondary text-sm mt-0.5 truncate">{appointment.vehicle}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="icon-btn-round shrink-0"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 mb-5 text-sm">
          <span className="text-label">Appointment</span>
          <span className="tabular text-[var(--foreground)]">
            {formatDateShort(appointment.appt_date)} · {formatTime12h(appointment.appt_time)}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <RepAvatar rep={rep ?? { display_name: "?", color_hex: "#8a9099", photo_url: null }} size={28} />
          <span className="text-sm text-[var(--foreground-muted)]">
            With <span className="font-semibold text-[var(--foreground)]">{rep?.display_name ?? "Unassigned"}</span>
          </span>
        </div>

        <div className="flex items-center justify-center gap-8 field py-4 mb-5">
          <StatusPill label="Confirmed" value={appointment.confirmed_status} />
          <StatusPill label="Show" value={appointment.showed_status} />
          <StatusPill label="Sold" value={appointment.sold_status} />
        </div>

        {appointment.vauto_link && (
          <a
            href={appointment.vauto_link}
            target="_blank"
            rel="noopener noreferrer"
            className="icon-btn mb-4 inline-flex"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 17h14M5 17a2 2 0 1 1 4 0M5 17l1.5-5.5A2 2 0 0 1 8.4 10h7.2a2 2 0 0 1 1.9 1.5L19 17m-4 0a2 2 0 1 1 4 0" />
            </svg>
            <span>vAuto</span>
          </a>
        )}

        {appointment.notes && (
          <div>
            <p className="text-label mb-1">Notes</p>
            <p className="text-sm text-[var(--foreground-muted)]">{appointment.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
