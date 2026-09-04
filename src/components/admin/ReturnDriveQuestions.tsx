"use client";

import { useState } from "react";
import { useDealershipSettings } from "@/lib/useLiveData";

/** Manager-configurable questions for Appraisal step 6 (the three return-drive questions). */
export function ReturnDriveQuestions() {
  const settings = useDealershipSettings();
  const [questions, setQuestions] = useState(["", "", ""]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Hydrate local editable state the moment settings first arrives from the
  // subscription (async, so not known at mount) — adjusting state during
  // render in response to a changed prop/value is the React-sanctioned
  // alternative to a setState-in-effect here.
  const [hydratedFrom, setHydratedFrom] = useState<typeof settings>(null);
  if (settings !== hydratedFrom) {
    setHydratedFrom(settings);
    if (settings?.return_drive_questions?.length === 3) setQuestions(settings.return_drive_questions);
  }

  const configured = settings?.return_drive_questions?.length === 3 && settings.return_drive_questions.every((q) => q.trim());

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ return_drive_questions: questions }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="py-6 border-b border-[var(--border)]">
      <h2 className="text-headline text-lg mb-1">Return-drive questions</h2>
      <p className="text-xs text-[var(--foreground-muted)] mb-3">
        Asked during Appraisal step 6, after the test drive. {!configured && (
          <span className="text-[var(--bad)]">Not yet configured — reps see generic placeholders until you set these.</span>
        )}
      </p>
      <div className="space-y-2 max-w-md">
        {questions.map((q, i) => (
          <input
            key={i}
            className="field w-full px-3 py-2 text-sm"
            placeholder={`Question ${i + 1}`}
            value={q}
            onChange={(e) => setQuestions((qs) => qs.map((v, idx) => (idx === i ? e.target.value : v)))}
          />
        ))}
      </div>
      <button
        onClick={save}
        disabled={saving || questions.some((q) => !q.trim())}
        className="mt-3 px-4 py-2 text-sm rounded-2xl font-medium bg-[var(--accent)] text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}
