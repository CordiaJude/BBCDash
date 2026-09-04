"use client";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "./supabase/browser";
import type { Appointment, DealershipSettings, Rep, TvSettings, WorkflowStepRow } from "./types";

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
        .is("deleted_at", null)
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

/** Soft-deleted appointments still within their 7-day retention window (Admin → "Recently deleted"). */
export function useDeletedAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    let active = true;

    const reload = () => {
      supabase
        .from("appointments")
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false })
        .then((res: { data: Appointment[] | null }) => {
          if (active && res.data) {
            setAppointments(res.data);
            setLoaded(true);
          }
        });
    };

    reload();

    const channel = supabase
      .channel("deleted-appointments-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, reload)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { appointments, loaded };
}

/** All workflow_steps rows (used by the admin Appraisal Funnel report to join against loaded appointments). */
export function useAllWorkflowSteps() {
  const [steps, setSteps] = useState<WorkflowStepRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    let active = true;

    const reload = () => {
      supabase
        .from("workflow_steps")
        .select("*")
        .then((res: { data: WorkflowStepRow[] | null }) => {
          if (active && res.data) {
            setSteps(res.data);
            setLoaded(true);
          }
        });
    };

    reload();

    const channel = supabase
      .channel("workflow-steps-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "workflow_steps" }, reload)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { steps, loaded };
}

/** Live workflow_steps rows for a single appointment — feeds the WorkflowModal so progress survives closing the tab. */
export function useWorkflowSteps(appointmentId: string) {
  const [steps, setSteps] = useState<WorkflowStepRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    let active = true;

    const reload = () => {
      supabase
        .from("workflow_steps")
        .select("*")
        .eq("appointment_id", appointmentId)
        .then((res: { data: WorkflowStepRow[] | null }) => {
          if (active && res.data) {
            setSteps(res.data);
            setLoaded(true);
          }
        });
    };

    reload();

    const channel = supabase
      .channel(`workflow-steps-${appointmentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workflow_steps", filter: `appointment_id=eq.${appointmentId}` },
        reload
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [appointmentId]);

  return { steps, loaded };
}

export function useDealershipSettings() {
  const [settings, setSettings] = useState<DealershipSettings | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    let active = true;

    const reload = () => {
      supabase
        .from("dealership_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle()
        .then((res: { data: DealershipSettings | null }) => {
          if (active && res.data) setSettings(res.data);
        });
    };

    reload();

    const channel = supabase
      .channel("dealership-settings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "dealership_settings" }, reload)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return settings;
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
