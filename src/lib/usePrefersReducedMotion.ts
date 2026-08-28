"use client";
import { useEffect, useState } from "react";

/**
 * Shared reduced-motion signal for JS-driven timing (animation delays,
 * staged unmounts, FLIP reorder). CSS-driven animation/transition durations
 * are handled globally by the `@media (prefers-reduced-motion: reduce)`
 * block in globals.css — this hook exists for the handful of places that
 * need to skip a setTimeout-based stagger, not to duplicate that CSS gate.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}
