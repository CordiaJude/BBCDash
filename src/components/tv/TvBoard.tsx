"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppointments, useReps, useTvSettings } from "@/lib/useLiveData";
import { useNowTick } from "@/lib/useNowTick";
import { useAlertScheduler } from "@/lib/useAlertScheduler";
import { unlockAudio, playAlertSound } from "@/lib/sounds";
import { endOfWeekISO, todayISO } from "@/lib/time";
import type { Appointment } from "@/lib/types";
import { AppointmentCard } from "../AppointmentCard";
import { AppointmentRow, AppointmentTableHeader } from "../AppointmentRow";
import { useSoldShimmer } from "@/lib/useSoldShimmer";
import { useFlipAnimation } from "@/lib/useFlipAnimation";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { EmptyState } from "@/components/EmptyState";

const ROLLOFF_FADE_MS = 1000;

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
  const reducedMotion = usePrefersReducedMotion();
  const shimmerIds = useSoldShimmer(appointments);

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

  // Appointments that just fell out of `weekAppts` (day rollover, or the
  // record disappearing entirely) stay rendered — with a fade-out class —
  // for one more beat instead of vanishing on the next tick. Entries are
  // always removed by their own timeout, so this map cannot grow unbounded
  // over a long-running TV session.
  const [fadingOut, setFadingOut] = useState<Map<string, Appointment>>(new Map());
  const prevWeekApptsRef = useRef<Appointment[]>([]);

  useEffect(() => {
    const prev = prevWeekApptsRef.current;
    const currentIds = new Set(weekAppts.map((a) => a.id));
    const justLeft = prev.filter((a) => !currentIds.has(a.id));
    prevWeekApptsRef.current = weekAppts;

    if (justLeft.length === 0) return;

    // Deferred (not synchronous in the effect body) to avoid a same-pass
    // cascading re-render.
    const add = setTimeout(() => {
      setFadingOut((m) => {
        const next = new Map(m);
        justLeft.forEach((a) => next.set(a.id, a));
        return next;
      });
    }, 0);

    const delay = reducedMotion ? 0 : ROLLOFF_FADE_MS;
    const timers = justLeft.map((a) =>
      setTimeout(() => {
        setFadingOut((m) => {
          const next = new Map(m);
          next.delete(a.id);
          return next;
        });
      }, delay)
    );
    return () => {
      clearTimeout(add);
      timers.forEach(clearTimeout);
    };
  }, [weekAppts, reducedMotion]);

  // Merge in fading-out ghosts (sorted first, since isComplete() on a
  // just-removed record is irrelevant to its exit) so they render with
  // `.appt-fade-out` until their timer above prunes them.
  const renderList = useMemo(() => {
    if (fadingOut.size === 0) return sorted;
    return [...sorted, ...fadingOut.values()];
  }, [sorted, fadingOut]);

  async function enableSound() {
    await unlockAudio();
    // unlockAudio's own blip is deliberately near-silent (it exists only to
    // satisfy the browser's autoplay gesture requirement) — play an
    // audible confirmation immediately so tapping this button actually
    // produces sound, instead of leaving the manager waiting until an
    // appointment happens to enter its alert window before hearing
    // anything at all.
    playAlertSound(settings?.alert_sound ?? "chime");
    setSoundUnlocked(true);
  }

  const layout = settings?.layout_mode ?? "single_list";

  // Cross-fade the whole layout container when a manager switches TV
  // layout mode, instead of jump-cutting to the new DOM shape.
  const [displayLayout, setDisplayLayout] = useState(layout);
  const [layoutFadeClass, setLayoutFadeClass] = useState("layout-fade-in");

  useEffect(() => {
    if (layout === displayLayout) return;
    if (reducedMotion) {
      const t = setTimeout(() => setDisplayLayout(layout), 0);
      return () => clearTimeout(t);
    }
    const fadeOut = setTimeout(() => setLayoutFadeClass("layout-fade-out"), 0);
    const swap = setTimeout(() => {
      setDisplayLayout(layout);
      setLayoutFadeClass("layout-fade-in");
    }, 200);
    return () => {
      clearTimeout(fadeOut);
      clearTimeout(swap);
    };
  }, [layout, displayLayout, reducedMotion]);

  const singleListRef = useRef<HTMLDivElement>(null);
  useFlipAnimation(
    singleListRef,
    renderList.map((a) => a.id),
    !reducedMotion
  );

  return (
    <div className="relative min-h-dvh p-4 sm:p-6">
      {settings?.alerts_enabled && !soundUnlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <button onClick={enableSound} className="panel-strong px-10 py-7 text-xl font-semibold hover:bg-[var(--panel-alt)] transition-colors">
            🔊 Tap to enable sound alerts
          </button>
        </div>
      )}

      {/* Quiet corner clock instead of a header bar — keeps the table as
          the only real focal point on screen. */}
      <div className="fixed bottom-4 right-4 z-20 pointer-events-none">
        <div className="pill-select tabular text-xs sm:text-sm shadow-sm opacity-90">
          {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} ·{" "}
          {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </div>
      </div>

      {!loaded && <p className="text-secondary text-lg">Loading…</p>}

      <div key={displayLayout} className={layoutFadeClass}>
        {displayLayout === "single_list" && (
          <div className="panel panel-tv w-full p-4 sm:p-6">
            <AppointmentTableHeader />
            <div ref={singleListRef}>
              {renderList.map((a) => (
                <div key={a.id} data-flip-id={a.id} className={fadingOut.has(a.id) ? "appt-fade-out" : "appt-card-enter"}>
                  <AppointmentRow appt={a} rep={repMap.get(a.rep_id ?? "")} now={now} editable={false} shimmer={shimmerIds.has(a.id)} showDateLabel />
                </div>
              ))}
            </div>
            {loaded && renderList.length === 0 && <EmptyState message="No appointments this week." />}
          </div>
        )}

        {displayLayout === "columns_per_rep" && (
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(reps.length, 1)}, minmax(240px, 1fr))` }}>
            {reps
              .filter((r) => r.active)
              .map((r) => (
                <div key={r.id}>
                  <div className="field px-3 py-2.5 mb-2 text-base text-headline flex items-center gap-2" style={{ borderLeft: `4px solid ${r.color_hex}` }}>
                    {r.display_name}
                  </div>
                  <div className="space-y-2.5">
                    {sorted
                      .filter((a) => a.rep_id === r.id)
                      .map((a) => (
                        <div key={a.id} className="appt-card-enter">
                          <AppointmentCard appt={a} rep={r} now={now} editable={false} compact tv shimmer={shimmerIds.has(a.id)} />
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {displayLayout === "columns_by_status" && (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4, minmax(240px, 1fr))" }}>
            {STATUS_COLUMNS.map((col) => (
              <div key={col.key}>
                <div className="field px-3 py-2.5 mb-2 text-base text-headline text-center">{col.label}</div>
                <div className="space-y-2.5">
                  {sorted
                    .filter((a) => statusBucket(a) === col.key)
                    .map((a) => (
                      <div key={a.id} className="appt-card-enter">
                        <AppointmentCard appt={a} rep={repMap.get(a.rep_id ?? "")} now={now} editable={false} compact tv shimmer={shimmerIds.has(a.id)} />
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
