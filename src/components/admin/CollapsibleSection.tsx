"use client";

import { useState } from "react";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      className="shrink-0 transition-transform"
      style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
    >
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Shared collapsible wrapper for every top-level Admin section (Recap, Appraisal Funnel, Recently deleted, Reps & managers). */
export function CollapsibleSection({
  title,
  right,
  defaultOpen = true,
  children,
  className,
}: {
  title: string;
  right?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`py-6 border-b border-[var(--border)] last:border-none ${className ?? ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-headline text-lg hover:opacity-80 transition-opacity"
          aria-expanded={open}
        >
          <ChevronIcon open={open} />
          {title}
        </button>
        {right}
      </div>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}
