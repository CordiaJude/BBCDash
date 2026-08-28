"use client";
import { useEffect, useRef } from "react";
import type { Appointment, TvSettings } from "./types";
import { minutesUntil } from "./time";
import { playAlertSound } from "./sounds";

export function useAlertScheduler(appointments: Appointment[], settings: TvSettings | null, soundUnlocked: boolean) {
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!settings?.alerts_enabled || !soundUnlocked) return;

    function check() {
      const now = new Date();
      for (const a of appointments) {
        const complete = a.confirmed_status !== "pending" && a.showed_status !== "pending" && a.sold_status !== "pending";
        if (complete) continue;
        const mins = minutesUntil(a.appt_date, a.appt_time, now);
        for (const offset of settings!.alert_offsets_minutes) {
          const key = `${a.id}-${offset}`;
          if (mins <= offset && mins > offset - 0.5 && !firedRef.current.has(key)) {
            firedRef.current.add(key);
            playAlertSound(settings!.alert_sound);
          }
        }
      }
    }

    check();
    const id = setInterval(check, 20000);
    return () => clearInterval(id);
  }, [appointments, settings, soundUnlocked]);
}
