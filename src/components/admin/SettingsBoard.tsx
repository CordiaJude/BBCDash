"use client";

import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/types";
import { useTvSettings } from "@/lib/useLiveData";
import { TvControls } from "./TvControls";
import { ThemeToggle } from "./ThemeToggle";
import { ReturnDriveQuestions } from "./ReturnDriveQuestions";

export function SettingsBoard({ user }: { user: SessionUser }) {
  const settings = useTvSettings();
  const router = useRouter();
  const isManager = user.role === "manager";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-headline text-2xl sm:text-3xl mb-5">Settings</h1>
      {isManager && settings && <TvControls settings={settings} />}
      {isManager && <ReturnDriveQuestions />}
      <ThemeToggle />

      <div className="pt-6">
        <h2 className="text-headline text-lg mb-3">Account</h2>
        <button
          onClick={logout}
          className="field px-4 py-2.5 text-sm font-medium text-[var(--bad)] hover:bg-[var(--hover-surface-strong)]"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
