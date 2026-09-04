"use client";

import { useAppointments, useReps, useTvSettings } from "@/lib/useLiveData";
import { UserManagement } from "./UserManagement";
import { TvControls } from "./TvControls";
import { Recap } from "./Recap";
import { RecentlyDeleted } from "./RecentlyDeleted";

export function AdminBoard() {
  const reps = useReps();
  const { appointments } = useAppointments();
  const settings = useTvSettings();

  return (
    <div>
      <h1 className="text-headline text-2xl sm:text-3xl mb-5">Admin</h1>
      <Recap appointments={appointments} />
      {settings && <TvControls settings={settings} />}
      <RecentlyDeleted />
      <UserManagement reps={reps} />
    </div>
  );
}
