import type { TriState } from "@/lib/types";

const CYCLE: TriState[] = ["pending", "yes", "no"];

export function nextTriState(current: TriState): TriState {
  // A previously-saved "maybe" value (from when a 4th state existed
  // briefly) isn't in CYCLE — indexOf returns -1, and (-1 + 1) % 3 = 0,
  // which lands on "pending" anyway, so no special-casing is needed.
  const idx = CYCLE.indexOf(current);
  return CYCLE[(idx + 1) % CYCLE.length];
}

/**
 * Three-state status circle:
 *   pending -> empty, gray-outline circle ("not yet")
 *   yes     -> solid green circle, white checkmark ("done")
 *   no      -> red-outline circle, red X ("rejected")
 * Clicking cycles blank -> check -> X -> blank. No schema/migration is
 * needed for this — both values were already valid per
 * supabase/migrations/0001_init.sql.
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
      </span>
      {showLabel && <span className="text-label">{label}</span>}
    </button>
  );
}
