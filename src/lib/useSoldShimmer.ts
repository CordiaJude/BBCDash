"use client";
import { useEffect, useRef, useState } from "react";
import type { Appointment } from "./types";

const SHIMMER_MS = 950;

/**
 * Tracks which appointment ids just had their `sold_status` flip to "yes"
 * so the caller can apply the one-time completion-shimmer flourish
 * (`animate-completion-shimmer`) to exactly that card, and only for that
 * transition — not confirmed/showed, and not a full re-render.
 *
 * Shared between DashboardBoard and TvBoard so the "sold" moment reads the
 * same everywhere. The seen-status map is pruned of ids no longer present
 * in `appointments` on every run so it can't grow unbounded over a
 * multi-day/multi-week TV session.
 */
export function useSoldShimmer(appointments: Appointment[]) {
  const [shimmerIds, setShimmerIds] = useState<Set<string>>(new Set());
  const prevSoldRef = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    const prev = prevSoldRef.current;
    const newlySold: string[] = [];
    const liveIds = new Set<string>();

    for (const a of appointments) {
      liveIds.add(a.id);
      const sold = a.sold_status === "yes";
      if (sold && prev.get(a.id) === false) newlySold.push(a.id);
      prev.set(a.id, sold);
    }
    // Prune entries for appointments that are no longer in the live set
    // (deleted, or rolled off the TV week) so this map can't grow forever.
    for (const id of prev.keys()) {
      if (!liveIds.has(id)) prev.delete(id);
    }

    if (newlySold.length === 0) return;

    // Deferred (not called synchronously in the effect body) so this
    // doesn't trigger a same-pass cascading re-render.
    const start = setTimeout(() => setShimmerIds((s) => new Set([...s, ...newlySold])), 0);
    const end = setTimeout(() => {
      setShimmerIds((s) => {
        const next = new Set(s);
        newlySold.forEach((id) => next.delete(id));
        return next;
      });
    }, SHIMMER_MS);
    return () => {
      clearTimeout(start);
      clearTimeout(end);
    };
  }, [appointments]);

  return shimmerIds;
}
