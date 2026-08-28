import type { TriState } from "@/lib/types";

const CYCLE: TriState[] = ["pending", "yes", "no"];

export function nextTriState(current: TriState): TriState {
  const idx = CYCLE.indexOf(current);
  return CYCLE[(idx + 1) % CYCLE.length];
}

export function StatusToggle({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: TriState;
  onChange: (next: TriState) => void;
  disabled?: boolean;
}) {
  const style =
    value === "yes"
      ? { bg: "rgba(63,184,138,0.18)", fg: "#3fb88a", ring: "rgba(63,184,138,0.5)" }
      : value === "no"
        ? { bg: "rgba(224,101,79,0.18)", fg: "#e0654f", ring: "rgba(224,101,79,0.5)" }
        : { bg: "rgba(255,255,255,0.04)", fg: "var(--foreground-muted)", ring: "rgba(255,255,255,0.14)" };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(nextTriState(value));
      }}
      title={`${label}: ${value}`}
      className="flex flex-col items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        style={{ background: style.bg, color: style.fg, boxShadow: `0 0 0 1px ${style.ring} inset` }}
      >
        {value === "yes" && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {value === "no" && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">{label}</span>
    </button>
  );
}
