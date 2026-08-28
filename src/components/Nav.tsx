"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/types";
import { RepAvatar } from "./RepAvatar";

export function Nav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const tabs = [
    { href: "/dashboard", label: "Dashboard" },
    ...(user.role === "manager" ? [{ href: "/admin", label: "Admin" }] : []),
    { href: "/tv", label: "TV Display" },
  ];

  return (
    <nav className="glass-panel mx-3 mt-3 sm:mx-6 sm:mt-6 px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-1 sm:gap-2">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`px-3 py-1.5 rounded-2xl text-sm font-medium transition-colors ${
              pathname.startsWith(t.href) ? "bg-[var(--hover-tint-strong)] text-[var(--foreground)]" : "text-[var(--foreground-muted)] hover:bg-[var(--hover-tint)]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <RepAvatar rep={{ display_name: user.display_name, color_hex: user.color_hex, photo_url: null }} size={26} />
          <span className="text-sm hidden sm:inline">{user.display_name}</span>
        </div>
        <button onClick={logout} className="glass-input px-3 py-1.5 text-sm hover:bg-[var(--hover-tint-strong)] transition">
          Log out
        </button>
      </div>
    </nav>
  );
}
