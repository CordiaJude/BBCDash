"use client";

import { useAppointments, useReps } from "@/lib/useLiveData";
import { UserManagement } from "./UserManagement";
import { Recap } from "./Recap";
import { RecentlyDeleted } from "./RecentlyDeleted";

export function AdminBoard() {
  const reps = useReps();
  const { appointments } = useAppointments();

  return (
    <div>
      <h1 className="text-headline text-2xl sm:text-3xl mb-5">Admin</h1>
      <Recap appointments={appointments} reps={reps} />
      <RecentlyDeleted reps={reps} />
      <UserManagement reps={reps} />
    </div>
  );
}
