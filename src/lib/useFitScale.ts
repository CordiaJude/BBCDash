"use client";

import { useLayoutEffect, useRef } from "react";

const MIN_SCALE = 0.4;

/**
 * Shrinks `contentRef`'s element (via CSS `zoom`, which reflows layout
 * unlike `transform: scale`) so its natural height fits inside
 * `containerRef`'s fixed viewport-height box with no scrolling — used by
 * the TV display, which must show every upcoming appointment on one
 * screen. Recomputes whenever `deps` changes (appointment count, layout
 * mode, …) and on window/container resize.
 */
export function useFitScale(deps: React.DependencyList) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    function measure() {
      const naturalHeight = content!.scrollHeight / zoomRef.current;
      const availableHeight = container!.clientHeight;
      if (naturalHeight <= 0 || availableHeight <= 0) return;
      const next = Math.min(1, Math.max(MIN_SCALE, availableHeight / naturalHeight));
      if (Math.abs(next - zoomRef.current) > 0.005) {
        zoomRef.current = next;
        content!.style.setProperty("zoom", String(next));
      }
    }

    zoomRef.current = 1;
    content.style.setProperty("zoom", "1");
    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    ro.observe(content);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { containerRef, contentRef };
}
