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
}) {
  const glow = upNextGlowClass(appt, now);
  const accent = rep?.color_hex ?? "#8b93a7";

  return (
    <div
      onClick={onClick}
      className={clsx(
        "glass-panel relative overflow-hidden p-3 sm:p-4 transition-transform",
        onClick && "cursor-pointer hover:-translate-y-0.5",
        glow,
        shimmer && "animate-completion-shimmer",
        hasConflict && "ring-1 ring-[#e0654f]/60"
      )}
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      {hasConflict && (
        <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wide text-[#e0654f] font-semibold">
          conflict
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <RepAvatar rep={rep ?? { display_name: "?", color_hex: accent, photo_url: null }} size={22} />
            <span className="text-xs text-[var(--foreground-muted)]">
              With: <span style={{ color: accent }} className="font-medium">{rep?.display_name ?? "Unassigned"}</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="tabular text-sm font-semibold">{formatTime12h(appt.appt_time)}</span>
            <span className="font-medium truncate">{appt.customer_name}</span>
          </div>
          <div className="text-sm text-[var(--foreground-muted)] truncate">{appt.vehicle}</div>
          {!compact && (
            <div className="mt-2">
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
