"use client";

import { useState } from "react";

type ThemeChoice = "light" | "dark" | "system";

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

function applyTheme(choice: ThemeChoice) {
  if (choice === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else if (choice === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  localStorage.setItem("theme", choice);
}

function readSavedChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem("theme") as ThemeChoice | null;
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch {
    // localStorage unavailable (private browsing, etc.) — fall through to default.
  }
  return "light";
}

export function ThemeToggle() {
  // Lazy-initialized from localStorage rather than read in an effect — the
  // inline script in layout.tsx already applied the saved theme to the DOM
  // before paint, this just matches this component's own displayed selection.
  const [choice, setChoice] = useState<ThemeChoice>(readSavedChoice);

  return (
    <div className="py-6 border-b border-[var(--border)]">
      <h2 className="text-headline text-lg mb-1">Appearance</h2>
      <p className="text-xs text-[var(--foreground-muted)] mb-3">
        Applies to this browser/device only.
      </p>
      <div className="flex field p-0.5 gap-0.5 w-fit">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => {
              setChoice(o.value);
              applyTheme(o.value);
            }}
            className={`px-3 py-1.5 rounded-[calc(var(--radius-md)-0.25rem)] text-sm font-medium transition-colors ${
              choice === o.value ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--hover-surface)]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
