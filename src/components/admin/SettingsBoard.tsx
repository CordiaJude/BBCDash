"use client";

import { useTvSettings } from "@/lib/useLiveData";
import { TvControls } from "./TvControls";
import { ThemeToggle } from "./ThemeToggle";

export function SettingsBoard() {
  const settings = useTvSettings();

  return (
    <div>
      <h1 className="text-headline text-2xl sm:text-3xl mb-5">Settings</h1>
      {settings && <TvControls settings={settings} />}
      <ThemeToggle />
    </div>
  );
}
