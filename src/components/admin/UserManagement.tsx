"use client";

import { useRef, useState } from "react";
import type { Rep } from "@/lib/types";
import { RepAvatar } from "../RepAvatar";
import { CollapsibleSection } from "./CollapsibleSection";

export function UserManagement({ reps }: { reps: Rep[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"rep" | "manager">("rep");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function addRep() {
    if (!email.trim() || !displayName.trim() || password.length < 8) {
      setError("Fill in email, display name, and a password of at least 8 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, display_name: displayName, password, role }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to create user.");
      return;
    }
    setEmail("");
    setDisplayName("");
    setPassword("");
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

  async function resetPassword(rep: Rep) {
    const newPassword = prompt(`New password for ${rep.display_name} (min 8 characters):`);
    if (!newPassword) return;
    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }
    await fetch(`/api/users/${rep.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
  }

  async function uploadPhoto(rep: Rep, file: File) {
    const form = new FormData();
    form.append("file", file);
    await fetch(`/api/users/${rep.id}/photo`, { method: "POST", body: form });
  }

  async function deleteRep(rep: Rep) {
    if (
      !confirm(
        `Permanently delete ${rep.display_name}'s account? This also deletes every appointment assigned to them. This cannot be undone.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/users/${rep.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to delete account.");
      return;
    }
    // The rep list's realtime channel doesn't reliably fire (users table
    // isn't in the Realtime publication — a known, separately-tracked
    // gap), so force a reload rather than leave a deleted account
    // visually lingering in the list.
    window.location.reload();
  }

  const addButton = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setShowAdd((v) => !v);
      }}
      className="px-3 py-1.5 rounded-2xl text-sm font-medium bg-[var(--accent)] text-white hover:brightness-110 transition"
    >
      {showAdd ? "Cancel" : "+ Add account"}
    </button>
  );

  return (
    <CollapsibleSection title="Reps & managers" right={addButton} defaultOpen={false}>
      {showAdd && (
        <div className="field p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className="field px-3 py-2"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="field px-3 py-2"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <input
            className="field px-3 py-2"
            placeholder="Password (min 8 characters)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <select className="field px-3 py-2" value={role} onChange={(e) => setRole(e.target.value as "rep" | "manager")}>
            <option value="rep">Rep</option>
            <option value="manager">Manager</option>
          </select>
          {error && <p className="sm:col-span-2 text-sm text-[var(--bad)]">{error}</p>}
          <button
            onClick={addRep}
            disabled={saving}
            className="sm:col-span-2 px-4 py-2 rounded-2xl text-sm font-medium bg-[var(--accent)] text-white hover:brightness-110 disabled:opacity-60 transition"
          >
            {saving ? "Creating…" : "Create account"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {reps.map((r) => (
          <div key={r.id} className="field flex items-center justify-between gap-3 p-3">
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
                  {r.email} · {r.role}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => resetPassword(r)} className="field px-2.5 py-1.5 text-xs hover:bg-[var(--hover-surface-strong)]">
                Reset password
              </button>
              <button
                onClick={() => toggleActive(r)}
                className="field px-2.5 py-1.5 text-xs hover:bg-[var(--hover-surface-strong)]"
              >
                {r.active ? "Deactivate" : "Reactivate"}
              </button>
              <button
                onClick={() => deleteRep(r)}
                className="field px-2.5 py-1.5 text-xs text-[var(--bad)] hover:bg-[var(--hover-surface-strong)]"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}
