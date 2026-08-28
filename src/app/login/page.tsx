"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

const MAX_TILT_DEG = 6;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const panelRef = useRef<HTMLFormElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Gentle pointer-driven tilt on the login panel. Scoped to the panel
  // itself (not a global window listener) so it only runs while the
  // pointer is actually over the panel, and only attaches at all on
  // hover-capable, fine-pointer devices with motion allowed — touch/no-
  // hover devices and reduced-motion users never get a listener. The
  // handler just writes two CSS custom properties — the actual transform
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

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (submitting || !email.trim() || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        setPassword("");
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

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <form
        ref={panelRef}
        onSubmit={submit}
        className="panel-strong login-panel-enter login-panel-tilt w-full max-w-sm p-8"
      >
        <h1 className="text-xl font-semibold text-center mb-1">Appointment Board</h1>
        <p className="text-sm text-[var(--foreground-muted)] text-center mb-6">Sign in with your email and password</p>

        <label className="block text-xs uppercase tracking-wide text-[var(--foreground-muted)] mb-1" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoFocus
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          className="field w-full px-3 py-2.5 mb-4 text-base"
          placeholder="jane@dealership.com"
          autoComplete="email"
          disabled={submitting}
        />

        <label className="block text-xs uppercase tracking-wide text-[var(--foreground-muted)] mb-1" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
          className="field w-full px-3 py-2.5 mb-5 text-base"
          placeholder="••••••••"
          autoComplete="current-password"
          disabled={submitting}
        />

        {error && <p className="text-sm text-[var(--bad)] text-center mb-3">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !email.trim() || !password}
          className="w-full py-3 rounded-2xl text-base font-medium bg-[var(--accent)] text-white hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
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
