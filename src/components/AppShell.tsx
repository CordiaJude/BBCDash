import type { SessionUser } from "@/lib/types";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

/**
 * Shared chrome for the rep dashboard and manager admin surfaces: a
 * gray page background, an icon-only sidebar (desktop) or pill bottom-nav
 * (mobile) for navigation, and a single opaque white content panel that
 * holds the page's own content. TV and login stay outside this shell —
 * TV is a standalone read-only display (no nav at all, per its existing
 * architecture) and login is a single centered card.
 */
export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col sm:flex-row gap-4 p-3 sm:p-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-5">
      <Sidebar user={user} />
      <main className="panel flex-1 min-w-0 p-4 sm:p-6 overflow-x-hidden">{children}</main>
      <BottomNav user={user} />
    </div>
  );
}
