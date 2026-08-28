"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

const MAX_TILT_DEG = 6;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Gentle pointer-driven tilt on the login panel. Scoped to the panel
  // itself (not a global window listener) so it only runs while the
  // pointer is actually over the panel, and only attaches at all on
  // hover-capable, fine-pointer devices with motion allowed — touch/no-
  // hover devices and reduced-motion users never get a listener. The
  // handler just writes two CSS custom properties; the actual transform
  // and its easing are pure CSS (`.login-panel-tilt` in globals.css).
  useEffect(() => {
    if (reducedMotion) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const el = panelRef.current;
    if (!el) return;

    function handleMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      el!.style.setProperty("--tilt-x", `${(-py * MAX_TILT_DEG).toFixed(2)}deg`);
      el!.style.setProperty("--tilt-y", `${(px * MAX_TILT_DEG).toFixed(2)}deg`);
    }
    function handleLeave() {
      el!.style.setProperty("--tilt-x", "0deg");
      el!.style.setProperty("--tilt-y", "0deg");
    }

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, [reducedMotion]);

  async function submit(finalPin: string) {
    if (submitting || !username.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, pin: finalPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        setPin("");
        setSubmitting(false);
        return;
      }
      router.push(params.get("next") || "/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  function pressDigit(d: string) {
    if (pin.length >= 4 || submitting) return;
    const next = pin + d;
    setPin(next);
    setError(null);
    if (next.length === 4) submit(next);
  }

  function backspace() {
    setPin((p) => p.slice(0, -1));
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div ref={panelRef} className="glass-panel-strong login-panel-enter login-panel-tilt w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold text-center mb-1">Appointment Board</h1>
        <p className="text-sm text-[var(--foreground-muted)] text-center mb-6">Sign in with your username and PIN</p>

        <label className="block text-xs uppercase tracking-wide text-[var(--foreground-muted)] mb-1">Username</label>
        <input
          autoFocus
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") document.getElementById("pin-0")?.focus();
          }}
          className="glass-input w-full px-3 py-2.5 mb-4 text-base"
          placeholder="jsmith"
          autoComplete="username"
          disabled={submitting}
        />

        <label className="block text-xs uppercase tracking-wide text-[var(--foreground-muted)] mb-1">PIN</label>
        <div className="flex gap-3 justify-center mb-5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              id={`pin-${i}`}
              className="w-12 h-14 rounded-2xl glass-input flex items-center justify-center text-2xl tabular"
            >
              {pin[i] ? "•" : ""}
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-[var(--bad)] text-center mb-3">{error}</p>}

        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => pressDigit(d)}
              disabled={submitting}
              className="glass-input py-3.5 text-lg font-medium hover:bg-[var(--hover-tint-strong)] active:scale-95 transition disabled:opacity-50"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={backspace}
            disabled={submitting}
            className="glass-input py-3.5 text-sm hover:bg-[var(--hover-tint-strong)] active:scale-95 transition disabled:opacity-50"
          >
            ⌫
          </button>
          <button
            type="button"
            onClick={() => pressDigit("0")}
            disabled={submitting}
            className="glass-input py-3.5 text-lg font-medium hover:bg-[var(--hover-tint-strong)] active:scale-95 transition disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => setPin("")}
            disabled={submitting}
            className="glass-input py-3.5 text-sm hover:bg-[var(--hover-tint-strong)] active:scale-95 transition disabled:opacity-50"
          >
            Clear
          </button>
        </div>
        {submitting && <p className="text-xs text-center text-[var(--foreground-muted)] mt-4">Checking…</p>}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
