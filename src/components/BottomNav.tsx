"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/types";
import { NAV_ITEMS } from "./Sidebar";
import clsx from "clsx";

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Mobile pill bottom-nav bar with a raised center "+" (add-appointment)
 * button. The "+" navigates to /dashboard?add=1 rather than calling a
 * handler directly — DashboardBoard (the sole owner of the add/edit modal
 * state) opens the existing AppointmentModal add flow when it sees that
 * query param on mount, then strips it. Same trigger the desktop header's
 * "+" button calls, just reached via navigation instead of local state,
 * since the FAB can be tapped from any page (TV excluded — no bottom nav
 * there) including ones that don't own the modal themselves.
 *
 * No log-out button here — it lives on the Settings tab instead, so this
 * bar stays purely navigational.
 */
export function BottomNav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const items = NAV_ITEMS(user.role);
  const mid = Math.ceil(items.length / 2);
  const left = items.slice(0, mid);
  const right = items.slice(mid);

  return (
    <nav
      aria-label="Primary"
      className="sm:hidden fixed left-4 right-4 z-30 flex items-center justify-center"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <div className="bottom-nav-bar relative flex items-center gap-1 px-3 py-2 w-full max-w-sm mx-auto">
        {left.map((item) => (
          <NavItem key={item.href} href={item.href} label={item.label} Icon={item.icon} active={pathname.startsWith(item.href)} />
        ))}

        <Link
          href="/dashboard?add=1"
          aria-label="Add appointment"
          className="bottom-nav-fab -mt-7 mx-1"
        >
          <PlusIcon />
        </Link>

        {right.map((item) => (
          <NavItem key={item.href} href={item.href} label={item.label} Icon={item.icon} active={pathname.startsWith(item.href)} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: () => React.ReactElement;
  active: boolean;
}) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={clsx("bottom-nav-item flex-1", active && "bottom-nav-item-active")}>
      <Icon />
      <span>{label}</span>
    </Link>
  );
}
