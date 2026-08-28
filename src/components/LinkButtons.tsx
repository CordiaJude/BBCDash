import type { Appointment } from "@/lib/types";

function LinkButton({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={label}
      className="glass-icon-btn"
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

export function LinkButtons({ appt }: { appt: Pick<Appointment, "appraisal_link" | "vauto_link" | "crm_link" | "crm_label"> }) {
  const hasAny = appt.appraisal_link || appt.vauto_link || appt.crm_link;
  if (!hasAny) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {appt.appraisal_link && (
        <LinkButton
          href={appt.appraisal_link}
          label="Appraisal"
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
          }
        />
      )}
      {appt.vauto_link && (
        <LinkButton
          href={appt.vauto_link}
          label="vAuto"
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 17h14M5 17a2 2 0 1 1 4 0M5 17l1.5-5.5A2 2 0 0 1 8.4 10h7.2a2 2 0 0 1 1.9 1.5L19 17m-4 0a2 2 0 1 1 4 0" />
            </svg>
          }
        />
      )}
      {appt.crm_link && (
        <LinkButton
          href={appt.crm_link}
          label={appt.crm_label ?? "CRM"}
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          }
        />
      )}
    </div>
  );
}
