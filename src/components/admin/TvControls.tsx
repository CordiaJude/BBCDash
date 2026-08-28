"use client";

import { useState } from "react";
import type { AlertSound, LayoutMode, TvSettings } from "@/lib/types";

const LAYOUTS: { value: LayoutMode; label: string; hint: string }[] = [
  { value: "single_list", label: "Single list", hint: "All reps mixed, sorted by time" },
  { value: "columns_per_rep", label: "Columns per rep", hint: "Side-by-side, one column each" },
  { value: "columns_by_status", label: "Columns by status", hint: "Upcoming / Confirmed / Showed / Sold" },
];

const SOUNDS: { value: AlertSound; label: string }[] = [
  { value: "chime", label: "Chime" },
  { value: "bell", label: "Bell" },
  { value: "soft_ping", label: "Soft ping" },
];

export function TvControls({ settings }: { settings: TvSettings }) {
  const [offsetsText, setOffsetsText] = useState(settings.alert_offsets_minutes.join(", "));
  const [saving, setSaving] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    await fetch("/api/tv-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
  }

  function saveOffsets() {
    const nums = offsetsText
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 0 && n <= 180);
    if (nums.length) patch({ alert_offsets_minutes: nums });
  }

  return (
    <div className="glass-panel p-4 sm:p-5">
      <h2 className="text-headline text-lg mb-4">TV display</h2>

      <p className="text-xs uppercase tracking-wide text-[var(--foreground-muted)] mb-2">Layout mode</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
        {LAYOUTS.map((l) => (
          <button
            key={l.value}
            onClick={() => patch({ layout_mode: l.value })}
            className={`glass-input p-3 text-left transition-colors ${
              settings.layout_mode === l.value ? "bg-[var(--hover-tint-strong)] ring-1 ring-[var(--accent)]/50" : "hover:bg-[var(--hover-tint)]"
            }`}
          >
            <div className="text-sm font-medium">{l.label}</div>
            <div className="text-xs text-[var(--foreground-muted)] mt-0.5">{l.hint}</div>
          </button>
        ))}
      </div>

      <p className="text-xs uppercase tracking-wide text-[var(--foreground-muted)] mb-2">Sound alerts</p>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.alerts_enabled}
            onChange={(e) => patch({ alerts_enabled: e.target.checked })}
            className="w-4 h-4"
          />
          Enabled
        </label>
        <select
          className="glass-input px-3 py-1.5 text-sm"
          value={settings.alert_sound}
          onChange={(e) => patch({ alert_sound: e.target.value })}
          disabled={!settings.alerts_enabled}
        >
          {SOUNDS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          className="glass-input px-3 py-1.5 text-sm tabular w-48"
          value={offsetsText}
          onChange={(e) => setOffsetsText(e.target.value)}
          placeholder="30, 15"
          disabled={!settings.alerts_enabled}
        />
        <button
          onClick={saveOffsets}
          disabled={!settings.alerts_enabled || saving}
          className="glass-input px-3 py-1.5 text-sm hover:bg-[var(--hover-tint-strong)] disabled:opacity-50"
        >
          Save
        </button>
        <span className="text-xs text-[var(--foreground-muted)]">minutes before start, comma separated</span>
      </div>
    </div>
  );
}
