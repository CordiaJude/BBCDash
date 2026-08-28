"use client";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "./supabase/browser";
import type { Appointment, Rep, TvSettings } from "./types";

export function useReps() {
  const [reps, setReps] = useState<Rep[]>([]);
  useEffect(() => {
    const supabase = getBrowserSupabase();
    let active = true;
    supabase
      .from("reps")
      .select("*")
      .order("created_at", { ascending: true })
      .then((res: { data: Rep[] | null }) => {
        if (active && res.data) setReps(res.data);
      });

    const channel = supabase
      .channel("reps-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        supabase
          .from("reps")
          .select("*")
          .order("created_at", { ascending: true })
          .then((res: { data: Rep[] | null }) => {
            if (active && res.data) setReps(res.data);
          });
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);
  return reps;
}

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    let active = true;

    const reload = () => {
      supabase
        .from("appointments")
        .select("*")
        .order("appt_date", { ascending: true })
        .order("appt_time", { ascending: true })
        .then((res: { data: Appointment[] | null }) => {
          if (active && res.data) {
            setAppointments(res.data);
            setLoaded(true);
          }
        });
    };

    reload();

    const channel = supabase
      .channel("appointments-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, reload)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { appointments, loaded };
}

export function useTvSettings() {
  const [settings, setSettings] = useState<TvSettings | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    let active = true;

    const reload = () => {
      supabase
        .from("tv_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle()
        .then((res: { data: TvSettings | null }) => {
          if (active && res.data) setSettings(res.data);
        });
    };

    reload();

    const channel = supabase
      .channel("tv-settings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tv_settings" }, reload)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return settings;
}
