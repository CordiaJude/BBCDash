"use client";
import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

/**
 * Lightweight FLIP (First-Last-Invert-Play) reorder animation for a flat
 * list of direct children inside `containerRef`. Each animatable child must
 * carry `data-flip-id` matching an entry in `ids`.
 *
 * Used so a completed appointment sinking to the bottom of its day (or a
 * layout re-sort) animates into its new position via a transform, instead
 * of jump-cutting. No new element is created or removed by this hook — it
 * only ever mutates `style.transform`/`style.transition` on existing DOM
 * nodes already rendered by React, and every rAF it schedules is one-shot
 * (not a loop), so there is nothing here to leak across renders.
 */
export function useFlipAnimation(
  containerRef: RefObject<HTMLElement | null>,
  ids: string[],
  enabled: boolean
) {
  const prevRects = useRef<Map<string, DOMRect>>(new Map());
  const key = ids.join("|");

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!enabled) {
      prevRects.current.clear();
      return;
    }

    const children = Array.from(container.children) as HTMLElement[];
    const newRects = new Map<string, DOMRect>();
    children.forEach((el) => {
      const id = el.dataset.flipId;
      if (id) newRects.set(id, el.getBoundingClientRect());
    });

    children.forEach((el) => {
      const id = el.dataset.flipId;
      if (!id) return;
      const prev = prevRects.current.get(id);
      const next = newRects.get(id);
      if (!prev || !next) return;
      const dx = prev.left - next.left;
      const dy = prev.top - next.top;
      if (!dx && !dy) return;

      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      // Force a reflow so the transform above is committed before we
      // transition it away — otherwise the browser would coalesce both
      // style writes into a single frame and skip the animation.
      void el.getBoundingClientRect();
      el.style.transition = "transform 500ms cubic-bezier(0.22, 1, 0.36, 1)";
      el.style.transform = "";
    });

    prevRects.current = newRects;
    // `key` is a stable stand-in for the `ids` array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
}
