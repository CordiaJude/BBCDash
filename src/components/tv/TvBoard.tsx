"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppointments, useReps, useTvSettings } from "@/lib/useLiveData";
import { useNowTick } from "@/lib/useNowTick";
import { useAlertScheduler } from "@/lib/useAlertScheduler";
import { unlockAudio } from "@/lib/sounds";
import { endOfWeekISO, formatDateShort, todayISO } from "@/lib/time";
import type { Appointment } from "@/lib/types";
import { AppointmentCard } from "../AppointmentCard";
import { useSoldShimmer } from "@/lib/useSoldShimmer";
import { useFlipAnimation } from "@/lib/useFlipAnimation";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

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
    <div className="min-h-dvh p-4 sm:p-6">
      {settings?.alerts_enabled && !soundUnlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <button
            onClick={enableSound}
            className="glass-panel-strong px-10 py-7 text-xl font-semibold hover:bg-[var(--hover-tint-strong)] transition"
          >
            🔊 Tap to enable sound alerts
          </button>
        </div>
      )}

      <div className="glass-panel glass-panel-tv px-6 py-4 mb-5 flex items-center justify-between">
        <h1 className="text-headline text-2xl">Appointment Board</h1>
        <span className="tabular text-lg text-secondary">
          {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} ·{" "}
          {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>

      {!loaded && <p className="text-secondary text-lg">Loading…</p>}

      <div key={displayLayout} className={layoutFadeClass}>
      {displayLayout === "single_list" && (
        <div ref={singleListRef} className="space-y-2.5 max-w-4xl mx-auto">
          {renderList.map((a) => (
            <div
              key={a.id}
              data-flip-id={a.id}
              className={fadingOut.has(a.id) ? "appt-fade-out" : "appt-card-enter"}
            >
              <div className="text-label mb-1 ml-1">
                {formatDateShort(a.appt_date)}
              </div>
              <AppointmentCard
                appt={a}
                rep={repMap.get(a.rep_id)}
                now={now}
                editable={false}
                tv
                shimmer={shimmerIds.has(a.id)}
              />
            </div>
          ))}
          {loaded && renderList.length === 0 && (
            <p className="text-center text-secondary text-lg py-16">No appointments this week.</p>
          )}
        </div>
      )}

      {displayLayout === "columns_per_rep" && (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(reps.length, 1)}, minmax(240px, 1fr))` }}>
          {reps
            .filter((r) => r.active)
            .map((r) => (
              <div key={r.id}>
                <div className="glass-input px-3 py-2.5 mb-2 text-base text-headline flex items-center gap-2" style={{ borderColor: "var(--border-glass-strong)", boxShadow: "0 6px 16px -10px var(--shadow-color-tv)", borderLeft: `4px solid ${r.color_hex}` }}>
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
              <div
                className="glass-input px-3 py-2.5 mb-2 text-base text-headline text-center"
                style={{ borderColor: "var(--border-glass-strong)", boxShadow: "0 6px 16px -10px var(--shadow-color-tv)" }}
              >
                {col.label}
              </div>
              <div className="space-y-2.5">
                {sorted
                  .filter((a) => statusBucket(a) === col.key)
                  .map((a) => (
                    <div key={a.id} className="appt-card-enter">
                      <AppointmentCard appt={a} rep={repMap.get(a.rep_id)} now={now} editable={false} compact tv shimmer={shimmerIds.has(a.id)} />
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
