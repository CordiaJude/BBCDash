/**
 * Shared "no appointments" empty state — a light 3D icon that bobs slowly.
 * Purely CSS-driven (see `.empty-state-icon` in globals.css); the float
 * animation and its perspective tilt are collapsed to static by the
 * blanket `prefers-reduced-motion: reduce` rule, no JS gating needed.
 */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <span className="empty-state-icon">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="10" width="44" height="38" rx="8" fill="var(--panel-glass-strong)" stroke="var(--border-glass-strong)" strokeWidth="1.5" />
          <path d="M6 20h44" stroke="var(--border-glass-strong)" strokeWidth="1.5" />
          <circle cx="17" cy="6" r="2.5" fill="var(--accent)" opacity="0.55" />
          <circle cx="39" cy="6" r="2.5" fill="var(--accent)" opacity="0.55" />
          <path d="M17 32l6 6 12-13" stroke="var(--foreground-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.35" />
        </svg>
      </span>
      <p className="text-sm text-[var(--foreground-muted)] text-center">{message}</p>
    </div>
  );
}
