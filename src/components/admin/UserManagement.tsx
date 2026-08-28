"use client";

import { useRef, useState } from "react";
import type { Rep } from "@/lib/types";
import { RepAvatar } from "../RepAvatar";

export function UserManagement({ reps }: { reps: Rep[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<"rep" | "manager">("rep");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function addRep() {
    if (!username.trim() || !displayName.trim() || !/^\d{4}$/.test(pin)) {
      setError("Fill in username, display name, and a 4-digit PIN.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, display_name: displayName, pin, role }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to create user.");
      return;
    }
    setUsername("");
    setDisplayName("");
    setPin("");
    setRole("rep");
    setShowAdd(false);
  }

  async function toggleActive(rep: Rep) {
    await fetch(`/api/users/${rep.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !rep.active }),
    });
  }

  async function resetPin(rep: Rep) {
    const newPin = prompt(`New 4-digit PIN for ${rep.display_name}:`);
    if (!newPin) return;
    if (!/^\d{4}$/.test(newPin)) {
      alert("PIN must be exactly 4 digits.");
      return;
    }
    await fetch(`/api/users/${rep.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: newPin }),
    });
  }

  async function uploadPhoto(rep: Rep, file: File) {
    const form = new FormData();
    form.append("file", file);
    await fetch(`/api/users/${rep.id}/photo`, { method: "POST", body: form });
  }

  return (
    <div className="glass-panel p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">Reps & managers</h2>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:brightness-110 transition"
        >
          {showAdd ? "Cancel" : "+ Add account"}
        </button>
      </div>

      {showAdd && (
        <div className="glass-input p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className="glass-input px-3 py-2"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="glass-input px-3 py-2"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <input
            className="glass-input px-3 py-2 tabular"
            placeholder="4-digit PIN"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
          <select className="glass-input px-3 py-2" value={role} onChange={(e) => setRole(e.target.value as "rep" | "manager")}>
            <option value="rep">Rep</option>
            <option value="manager">Manager</option>
          </select>
          {error && <p className="sm:col-span-2 text-sm text-[#e0654f]">{error}</p>}
          <button
            onClick={addRep}
            disabled={saving}
            className="sm:col-span-2 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--accent)] text-white hover:brightness-110 disabled:opacity-60 transition"
          >
            {saving ? "Creating…" : "Create account"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {reps.map((r) => (
          <div key={r.id} className="glass-input flex items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => fileInputs.current[r.id]?.click()} title="Change photo">
                <RepAvatar rep={r} size={36} />
              </button>
              <input
                ref={(el) => {
                  fileInputs.current[r.id] = el;
                }}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadPhoto(r, file);
                  e.target.value = "";
                }}
              />
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {r.display_name} {!r.active && <span className="text-xs text-[var(--foreground-muted)]">(inactive)</span>}
                </div>
                <div className="text-xs text-[var(--foreground-muted)]">
                  @{r.username} · {r.role}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => resetPin(r)} className="glass-input px-2.5 py-1.5 text-xs hover:bg-white/10">
                Reset PIN
              </button>
              <button
                onClick={() => toggleActive(r)}
                className="glass-input px-2.5 py-1.5 text-xs hover:bg-white/10"
              >
                {r.active ? "Deactivate" : "Reactivate"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
