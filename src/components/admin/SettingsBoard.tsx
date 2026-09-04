"use client";

import { useTvSettings } from "@/lib/useLiveData";
import { TvControls } from "./TvControls";
import { ThemeToggle } from "./ThemeToggle";
import { ReturnDriveQuestions } from "./ReturnDriveQuestions";

export function SettingsBoard() {
  const settings = useTvSettings();

  return (
    <div>
      <h1 className="text-headline text-2xl sm:text-3xl mb-5">Settings</h1>
      {settings && <TvControls settings={settings} />}
      <ReturnDriveQuestions />
      <ThemeToggle />
    </div>
  );
}
