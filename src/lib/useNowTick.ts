"use client";
import { useEffect, useState } from "react";

// Re-renders every `intervalMs` so time-relative UI (up-next glow, alerts) stays current.
export function useNowTick(intervalMs = 15000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
