import type { TriState } from "@/lib/types";

const CYCLE: TriState[] = ["pending", "yes", "no"];

export function nextTriState(current: TriState): TriState {
  const idx = CYCLE.indexOf(current);
  return CYCLE[(idx + 1) % CYCLE.length];
}

/**
 * Flat tri-state circle, reusing the app's existing pending/yes/no field
 * (see src/lib/types.ts — no schema change) mapped onto the reference's
 * three visual states:
 *   pending -> empty, gray-outline circle ("not yet")
 *   yes     -> solid green circle, white checkmark ("done")
 *   no      -> blue-outline circle, blue "?" (this field's other resolved
 *              state — there is no separate "uncertain" concept in the
 *              data model, so it borrows the reference's blue-question
 *              treatment rather than a red/rejected one; see the phase
 *              report for the explicit reasoning)
 */
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
      ? { bg: "var(--ok)", fg: "var(--ok-icon)", ring: "transparent" }
      : value === "no"
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
        {value === "no" && <span className="text-sm font-bold leading-none">?</span>}
      </span>
      <span className="text-label">{label}</span>
    </button>
  );
}
