"use client";

import { useAppointments, useReps, useTvSettings } from "@/lib/useLiveData";
import { UserManagement } from "./UserManagement";
import { TvControls } from "./TvControls";
import { Recap } from "./Recap";

export function AdminBoard() {
  const reps = useReps();
  const { appointments } = useAppointments();
  const settings = useTvSettings();

  return (
    <div className="space-y-5">
      <Recap appointments={appointments} />
      {settings && <TvControls settings={settings} />}
      <UserManagement reps={reps} />
    </div>
  );
}
