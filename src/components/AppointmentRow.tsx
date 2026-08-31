"use client";

import type { Appointment, Rep, TriState } from "@/lib/types";
import { LinkButtons } from "./LinkButtons";
import { StatusToggle } from "./StatusToggle";
import { formatTime12h, minutesUntil } from "@/lib/time";
import clsx from "clsx";

/**
 * Clean table-row rendering of an appointment (rep dashboard, TV
 * single-list) — a structural alternative to AppointmentCard's vertical
 * card, not a "flat mode" bolted onto it, since a table row's shape
 * (one horizontal line of columns) and a card's shape (a stacked block)
 * share little markup. AppointmentCard is kept for TV's per-rep/
 * per-status column layouts, where a full multi-column table header
 * doesn't fit a narrow column.
 */
export const ROW_GRID = "minmax(108px,1fr) minmax(88px,0.8fr) minmax(170px,1.8fr) minmax(170px,1.8fr) repeat(3, minmax(96px,1fr))";

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" strokeLinecap="round" />
    </svg>
  );
}
function CarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 16l1.4-4.8A2 2 0 0 1 7.3 10h9.4a2 2 0 0 1 1.9 1.2L20 16" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="16" width="18" height="4" rx="1.5" />
      <circle cx="7.5" cy="20" r="1.4" />
      <circle cx="16.5" cy="20" r="1.4" />
    </svg>
  );
}
function ConfirmedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
      <path d="M8 15l2.5 2.5L16 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 21V4" strokeLinecap="round" />
      <path d="M5 4h12l-3 4 3 4H5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AppointmentTableHeader() {
  return (
    <div className="appt-table-header" style={{ gridTemplateColumns: ROW_GRID, paddingLeft: "1.25rem" }}>
      <span className="flex items-center gap-1.5">
        <CalendarIcon /> Appt Date
      </span>
      <span className="flex items-center gap-1.5">
        <ClockIcon /> Appt Time
      </span>
      <span className="flex items-center gap-1.5">
        <PersonIcon /> Name
      </span>
      <span className="flex items-center gap-1.5">
        <CarIcon /> Vehicle
      </span>
      <span className="flex items-center justify-center gap-1.5 text-center">
        <ConfirmedIcon /> Appt Confirmed
      </span>
      <span className="flex items-center justify-center gap-1.5 text-center">
        <PersonIcon /> Appt Show
      </span>
      <span className="flex items-center justify-center gap-1.5 text-center">
        <FlagIcon /> Acquired
      </span>
    </div>
  );
}

export function upNextGlowClass(
  appt: Pick<Appointment, "appt_date" | "appt_time" | "confirmed_status" | "showed_status" | "sold_status">,
  now: Date
) {
  const isComplete =
    appt.confirmed_status !== "pending" && appt.showed_status !== "pending" && appt.sold_status !== "pending";
  if (isComplete) return "";
  const mins = minutesUntil(appt.appt_date, appt.appt_time, now);
  if (mins < 0 || mins > 30) return "";
  return mins <= 15 ? "up-next-glow-urgent" : "up-next-glow";
}

export function AppointmentRow({
  appt,
  rep,
  onStatusChange,
  onClick,
  hasConflict,
  shimmer,
  now,
  editable = true,
  showDateLabel = true,
}: {
  appt: Appointment;
  rep: Rep | undefined;
  onStatusChange?: (field: "confirmed_status" | "showed_status" | "sold_status", value: TriState) => void;
  onClick?: () => void;
  hasConflict?: boolean;
  shimmer?: boolean;
  now: Date;
  editable?: boolean;
  /** Hide the date column's date and only show a "Today"-style relative label — dashboard convenience. */
  showDateLabel?: boolean;
}) {
  const glow = upNextGlowClass(appt, now);
  const accent = rep?.color_hex ?? "#8a9099";
  const dateLabel = showDateLabel
    ? new Date(`${appt.appt_date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : appt.appt_date;

  return (
    <div
      onClick={onClick}
      className={clsx(
        "appt-row relative",
        onClick && "clickable",
        glow,
        shimmer && "animate-completion-shimmer",
        hasConflict && "ring-2 ring-[var(--bad)]/50"
      )}
      style={{ gridTemplateColumns: ROW_GRID, paddingLeft: "1.25rem" }}
    >
      <span className="rep-edge-bar" style={{ background: accent }} aria-hidden="true" />

      <span className="text-sm text-secondary tabular">{dateLabel}</span>
      <span className="text-sm text-secondary tabular">{formatTime12h(appt.appt_time)}</span>

      <div className="min-w-0">
        <div className="text-sm font-semibold text-[var(--foreground)] truncate">{appt.customer_name}</div>
        <div className="text-xs text-[var(--foreground-faint)] truncate mt-0.5">
          With {rep?.display_name ?? "Unassigned"}
          {hasConflict && <span className="text-[var(--bad)] font-semibold ml-1.5">· conflict</span>}
        </div>
      </div>

      <div className="min-w-0">
        <div className="text-sm text-[var(--foreground)] truncate">{appt.vehicle}</div>
        {appt.vauto_link && (
          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
            <LinkButtons appt={appt} />
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <StatusToggle
          label="Confirmed"
          value={appt.confirmed_status}
          disabled={!editable}
          onChange={(v) => onStatusChange?.("confirmed_status", v)}
          showLabel={false}
        />
      </div>
      <div className="flex justify-center">
        <StatusToggle
          label="Show"
          value={appt.showed_status}
          disabled={!editable}
          onChange={(v) => onStatusChange?.("showed_status", v)}
          showLabel={false}
        />
      </div>
      <div className="flex justify-center">
        <StatusToggle
          label="Sold"
          value={appt.sold_status}
          disabled={!editable}
          onChange={(v) => onStatusChange?.("sold_status", v)}
          showLabel={false}
        />
      </div>
    </div>
  );
}
