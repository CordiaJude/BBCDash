import type { TriState } from "@/lib/types";

const CYCLE: TriState[] = ["pending", "yes", "no", "maybe"];

export function nextTriState(current: TriState): TriState {
  const idx = CYCLE.indexOf(current);
  return CYCLE[(idx + 1) % CYCLE.length];
}

/**
 * Four-state status circle (see supabase/migrations/0003_four_state_status.sql
 * for the schema change that added the "maybe" value):
 *   pending -> empty, gray-outline circle ("not yet")
 *   yes     -> solid green circle, white checkmark ("done")
 *   no      -> red-outline circle, red X ("rejected")
 *   maybe   -> blue-outline circle, blue "?" ("uncertain")
 * Clicking cycles through all four in that order.
 */
export function StatusToggle({
  label,
  value,
  onChange,
  disabled,
  showLabel = true,
}: {
  label: string;
  value: TriState;
  onChange: (next: TriState) => void;
  disabled?: boolean;
  /** Hide the text label under the circle — used in table rows, where the column header already labels it (matches the reference: only the header carries text, data rows show just the circle). */
  showLabel?: boolean;
}) {
  const style =
    value === "yes"
      ? { bg: "var(--ok)", fg: "var(--ok-icon)", ring: "transparent" }
      : value === "no"
        ? { bg: "transparent", fg: "var(--bad)", ring: "var(--bad)" }
        : value === "maybe"
          ? { bg: "transparent", fg: "var(--accent)", ring: "var(--accent)" }
          : { bg: "transparent", fg: "var(--pending-outline)", ring: "var(--pending-outline)" };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(nextTriState(value));
      }}
      title={`${label}: ${value}`}
      aria-label={`${label}: ${value}`}
      className="flex flex-col items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed group"
    >
      <span
        className="status-circle"
        style={{
          background: style.bg,
          color: style.fg,
          boxShadow: style.ring === "transparent" ? "none" : `0 0 0 1.5px ${style.ring} inset`,
        }}
      >
        {value === "yes" && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {value === "no" && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        )}
        {value === "maybe" && <span className="text-sm font-bold leading-none">?</span>}
      </span>
      {showLabel && <span className="text-label">{label}</span>}
    </button>
  );
}
