import type { Appointment } from "@/lib/types";

function LinkButton({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={label}
      className="icon-btn"
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

export function LinkButtons({ appt }: { appt: Pick<Appointment, "vauto_link"> }) {
  if (!appt.vauto_link) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      <LinkButton
        href={appt.vauto_link}
        label="vAuto"
        icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 17h14M5 17a2 2 0 1 1 4 0M5 17l1.5-5.5A2 2 0 0 1 8.4 10h7.2a2 2 0 0 1 1.9 1.5L19 17m-4 0a2 2 0 1 1 4 0" />
          </svg>
        }
      />
    </div>
  );
}
