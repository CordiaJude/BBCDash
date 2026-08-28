"use client";

import type { Appointment, Rep, TriState } from "@/lib/types";
import { RepAvatar } from "./RepAvatar";
import { LinkButtons } from "./LinkButtons";
import { StatusToggle } from "./StatusToggle";
import { formatTime12h, minutesUntil } from "@/lib/time";
import clsx from "clsx";

export function upNextGlowClass(appt: Pick<Appointment, "appt_date" | "appt_time" | "confirmed_status" | "showed_status" | "sold_status">, now: Date) {
  const isComplete =
    appt.confirmed_status !== "pending" && appt.showed_status !== "pending" && appt.sold_status !== "pending";
  if (isComplete) return "";
  const mins = minutesUntil(appt.appt_date, appt.appt_time, now);
  if (mins < 0 || mins > 30) return "";
  return mins <= 15 ? "up-next-glow-urgent" : "up-next-glow";
}

/**
 * Compact card presentation, kept specifically for TV's per-rep and
 * per-status column layouts (a wide table header doesn't fit a narrow
 * grid column). The rep dashboard and TV's single-list view use the flat
 * table rendering in AppointmentRow.tsx instead — see that file's header
 * comment for why this stayed a separate component rather than a "mode"
 * on this one.
 */
export function AppointmentCard({
  appt,
  rep,
  onStatusChange,
  onClick,
  hasConflict,
  shimmer,
  now,
  editable = true,
  compact = false,
  tv = false,
}: {
  appt: Appointment;
  rep: Rep | undefined;
  onStatusChange?: (field: "confirmed_status" | "showed_status" | "sold_status", value: TriState) => void;
  onClick?: () => void;
  hasConflict?: boolean;
  shimmer?: boolean;
  now: Date;
  editable?: boolean;
  compact?: boolean;
  /** Bolder, larger type for legibility from ~10ft on the TV display. */
  tv?: boolean;
}) {
  const glow = upNextGlowClass(appt, now);
  const accent = rep?.color_hex ?? "#8a9099";

  return (
    <div
      onClick={onClick}
      className={clsx(
        "panel relative overflow-hidden",
        tv && "panel-tv",
        tv ? "p-4 sm:p-5" : "p-3 sm:p-4",
        onClick && "cursor-pointer",
        glow,
        shimmer && "animate-completion-shimmer",
        hasConflict && "ring-2 ring-[var(--bad)]/50"
      )}
      style={{ borderLeft: `${tv ? 5 : 4}px solid ${accent}` }}
    >
      {hasConflict && (
        <span className={clsx("absolute top-2 right-2 text-[var(--bad)]", tv ? "text-sm font-bold uppercase tracking-wide" : "text-label")}>
          conflict
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={clsx("tabular text-headline", tv ? "text-2xl sm:text-3xl" : "text-base sm:text-lg")}>
              {formatTime12h(appt.appt_time)}
            </span>
            <span className={clsx("text-headline truncate", tv ? "text-2xl sm:text-3xl" : "text-base sm:text-lg")}>
              {appt.customer_name}
            </span>
          </div>
          <div className={clsx("text-secondary truncate mt-0.5", tv ? "text-lg" : "text-sm")}>{appt.vehicle}</div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <RepAvatar rep={rep ?? { display_name: "?", color_hex: accent, photo_url: null }} size={tv ? 26 : 20} />
            <span className={clsx("text-[var(--foreground-faint)]", tv ? "text-base" : "text-xs")}>
              With <span className="font-semibold text-[var(--foreground-muted)]">{rep?.display_name ?? "Unassigned"}</span>
            </span>
          </div>
          {!compact && (
            <div className="mt-2.5">
              <LinkButtons appt={appt} />
            </div>
          )}
          {!compact && appt.notes && (
            <div className="mt-2 text-xs text-[var(--foreground-muted)] line-clamp-2">{appt.notes}</div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <StatusToggle
            label="Conf"
            value={appt.confirmed_status}
            disabled={!editable}
            onChange={(v) => onStatusChange?.("confirmed_status", v)}
          />
          <StatusToggle
            label="Show"
            value={appt.showed_status}
            disabled={!editable}
            onChange={(v) => onStatusChange?.("showed_status", v)}
          />
          <StatusToggle
            label="Sold"
            value={appt.sold_status}
            disabled={!editable}
            onChange={(v) => onStatusChange?.("sold_status", v)}
          />
        </div>
      </div>
    </div>
  );
}
