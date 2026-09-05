"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Appointment, SessionUser, TriState } from "@/lib/types";
import { useAppointments, useDealershipSettings, useReps } from "@/lib/useLiveData";
import { WorkflowModal } from "./WorkflowModal";
import { useNowTick } from "@/lib/useNowTick";
import { useSoldShimmer } from "@/lib/useSoldShimmer";
import { EmptyState } from "@/components/EmptyState";
import { AppointmentRow, AppointmentTableHeader } from "./AppointmentRow";
import { AppointmentCard } from "./AppointmentCard";
import { AppointmentModal } from "./AppointmentModal";
import { todayISO } from "@/lib/time";

function isComplete(a: Appointment) {
  return a.confirmed_status !== "pending" && a.showed_status !== "pending" && a.sold_status !== "pending";
}

type Timeframe = "all" | "upcoming";
type Stage = "all" | "pending" | "confirmed" | "showed" | "sold" | "no_show";

const STAGES: { value: Stage; label: string }[] = [
  { value: "all", label: "All stages" },
  { value: "pending", label: "Not yet confirmed" },
  { value: "confirmed", label: "Confirmed" },
  { value: "showed", label: "Showed" },
  { value: "sold", label: "Sold" },
  { value: "no_show", label: "No-show" },
];

function matchesStage(a: Appointment, stage: Stage): boolean {
  if (stage === "all") return true;
  if (stage === "pending") return a.confirmed_status === "pending";
  if (stage === "confirmed") return a.confirmed_status === "yes" && a.showed_status === "pending";
  if (stage === "showed") return a.showed_status === "yes" && a.sold_status === "pending";
  if (stage === "sold") return a.sold_status === "yes";
  return a.showed_status === "no";
}

function FilterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}
function ChevronDownIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

export function DashboardBoard({ user }: { user: SessionUser }) {
  const router = useRouter();
  const { appointments, loaded } = useAppointments();
  const reps = useReps();
  const dealershipSettings = useDealershipSettings();
  const [workflowAppt, setWorkflowAppt] = useState<Appointment | null>(null);
  const now = useNowTick();
  const [scope, setScope] = useState<"mine" | "everyone">(user.role === "manager" ? "everyone" : "mine");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>("all");
  const [stage, setStage] = useState<Stage>("all");
  const [repFilter, setRepFilter] = useState<string>("all");
  const shimmerIds = useSoldShimmer(appointments);

  // The bottom-nav "+" (mobile) links to /dashboard?add=1 rather than
  // calling a handler directly, since it can be tapped from any page.
  // This opens the exact same add-appointment flow the header's "+"
  // button below triggers, then strips the param.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("add") !== "1") return;
    const t = setTimeout(() => {
      setEditing(null);
      setModalOpen(true);
      router.replace("/dashboard");
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const repMap = useMemo(() => new Map(reps.map((r) => [r.id, r])), [reps]);

  const today = todayISO();
  const scoped = useMemo(() => {
    return appointments.filter((a) => {
      if (scope === "mine" && a.rep_id !== user.id) return false;
      if (repFilter !== "all" && a.rep_id !== repFilter) return false;
      if (timeframe === "upcoming" && a.appt_date < today) return false;
      if (!matchesStage(a, stage)) return false;
      return true;
    });
  }, [appointments, scope, user.id, repFilter, timeframe, stage, today]);

  const activeFilterCount = (timeframe !== "all" ? 1 : 0) + (stage !== "all" ? 1 : 0) + (repFilter !== "all" ? 1 : 0);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!q) return scoped;
    return scoped.filter((a) => a.customer_name.toLowerCase().includes(q) || a.vehicle.toLowerCase().includes(q));
  }, [scoped, q]);

  const conflictKeys = useMemo(() => {
    // A conflict is the SAME rep double-booked at the same date+time —
    // not merely two different reps each having their own appointment then.
    const counts = new Map<string, number>();
    for (const a of appointments) {
      const key = `${a.rep_id}|${a.appt_date}|${a.appt_time}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const conflicted = new Set<string>();
    for (const [key, count] of counts) if (count > 1) conflicted.add(key);
    return conflicted;
  }, [appointments]);

  const active = visible
    .filter((a) => !isComplete(a) || a.appt_date !== today)
    .slice()
    .sort((a, b) => (a.appt_date + a.appt_time).localeCompare(b.appt_date + b.appt_time));
  const completedToday = visible.filter((a) => isComplete(a) && a.appt_date === today);

  async function setStatus(appt: Appointment, field: "confirmed_status" | "showed_status" | "sold_status", value: TriState) {
    // Tapping "Show" launches the guided MGM/Appraisal workflow instead of
    // flipping the tri-state directly — see WorkflowModal. The circle
    // itself becomes a reflection of workflow progress, not a manual toggle.
    if (field === "showed_status") {
      setWorkflowAppt(appt);
      return;
    }
    await fetch(`/api/appointments/${appt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  }

  function openEdit(appt: Appointment) {
    setEditing(appt);
    setModalOpen(true);
  }

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-3 mb-5">
        <h1 className="text-headline text-2xl sm:text-3xl">Today&rsquo;s Dashboard</h1>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date/scope selector pill — icon + text + chevron, reusing the
              existing "mine"/"everyone" scope (no per-day filter exists in
              the data layer to wire a real date-picker to without adding
              new business logic, so this pill drives the one real filter
              the app already has). */}
          <label className="pill-select cursor-pointer">
            <CalendarIcon />
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as "mine" | "everyone")}
              className="appearance-none bg-transparent outline-none border-none pr-1 cursor-pointer"
              aria-label="Filter appointments"
            >
              <option value="mine">My appointments</option>
              <option value="everyone">Everyone</option>
            </select>
            <ChevronDownIcon />
          </label>

          <div className="relative">
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className={`pill-select cursor-pointer ${activeFilterCount > 0 ? "ring-1 ring-[var(--accent)]" : ""}`}
              aria-expanded={filtersOpen}
            >
              <FilterIcon />
              <span className="text-sm">Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</span>
            </button>

            {filtersOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setFiltersOpen(false)} />
                <div className="panel-strong absolute right-0 top-full mt-2 z-20 p-4 w-72 space-y-3">
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-[var(--foreground-muted)] mb-1">
                      Timeframe
                    </label>
                    <div className="flex field p-0.5 gap-0.5">
                      {(["all", "upcoming"] as Timeframe[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTimeframe(t)}
                          className={`flex-1 px-2.5 py-1.5 rounded-[calc(var(--radius-md)-0.25rem)] text-xs font-medium transition-colors ${
                            timeframe === t ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--hover-surface)]"
                          }`}
                        >
                          {t === "all" ? "All" : "Upcoming"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wide text-[var(--foreground-muted)] mb-1">
                      Stage
                    </label>
                    <select
                      value={stage}
                      onChange={(e) => setStage(e.target.value as Stage)}
                      className="field w-full px-3 py-2 text-sm"
                    >
                      {STAGES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {user.role === "manager" && (
                    <div>
                      <label className="block text-xs uppercase tracking-wide text-[var(--foreground-muted)] mb-1">
                        Rep
                      </label>
                      <select
                        value={repFilter}
                        onChange={(e) => setRepFilter(e.target.value)}
                        className="field w-full px-3 py-2 text-sm"
                      >
                        <option value="all">All reps</option>
                        {reps.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.display_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => {
                        setTimeframe("all");
                        setStage("all");
                        setRepFilter("all");
                      }}
                      className="text-xs text-[var(--foreground-faint)] hover:text-[var(--foreground)]"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {searchOpen ? (
            <div className="field flex items-center gap-2 h-11 px-3">
              <SearchIcon />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or vehicle…"
                className="bg-transparent outline-none border-none text-sm w-40 sm:w-56"
              />
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setQuery("");
                }}
                aria-label="Close search"
                className="text-[var(--foreground-faint)] hover:text-[var(--foreground)]"
              >
                <CloseIcon />
              </button>
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)} className="icon-btn-round" aria-label="Search appointments">
              <SearchIcon />
            </button>
          )}

          <button onClick={openAdd} className="fab-accent" aria-label="Add appointment">
            <PlusIcon />
          </button>
        </div>
      </div>

      {!loaded && <p className="text-sm text-[var(--foreground-muted)]">Loading…</p>}

      {/* Desktop/tablet: the full multi-column table (unchanged). Below the
          sm breakpoint it's replaced entirely by a stacked card list (see
          below) rather than letting it scroll sideways — a table with this
          many columns can't be shrunk to a phone width without squishing
          the text into illegibility. */}
      <div className="hidden sm:block overflow-x-auto -mx-1">
        <div className="min-w-[760px] px-1">
          <AppointmentTableHeader />
          <div>
            {active.map((a) => (
              <div key={a.id} className="appt-card-enter">
                <AppointmentRow
                  appt={a}
                  rep={repMap.get(a.rep_id ?? "")}
                  now={now}
                  editable={user.role === "manager" || a.rep_id === user.id}
                  onStatusChange={(field, v) => setStatus(a, field, v)}
                  onClick={() => openEdit(a)}
                  hasConflict={conflictKeys.has(`${a.rep_id}|${a.appt_date}|${a.appt_time}`)}
                  shimmer={shimmerIds.has(a.id)}
                />
              </div>
            ))}
          </div>
          {loaded && active.length === 0 && <EmptyState message="No appointments here yet." />}

          {completedToday.length > 0 && (
            <div className="mt-8">
              <h3 className="text-label mb-2 ml-1">Completed today</h3>
              <div className="opacity-90">
                {completedToday.map((a) => (
                  <div key={a.id} className="appt-card-enter">
                    <AppointmentRow
                      appt={a}
                      rep={repMap.get(a.rep_id ?? "")}
                      now={now}
                      editable={user.role === "manager" || a.rep_id === user.id}
                      onStatusChange={(field, v) => setStatus(a, field, v)}
                      onClick={() => openEdit(a)}
                      shimmer={shimmerIds.has(a.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: one stacked column of full-width cards, no side-scrolling
          and nothing squeezed — same data, same taps, different shape. */}
      <div className="sm:hidden space-y-2.5">
        {active.map((a) => (
          <div key={a.id} className="appt-card-enter">
            <AppointmentCard
              appt={a}
              rep={repMap.get(a.rep_id ?? "")}
              now={now}
              editable={user.role === "manager" || a.rep_id === user.id}
              onStatusChange={(field, v) => setStatus(a, field, v)}
              onClick={() => openEdit(a)}
              hasConflict={conflictKeys.has(`${a.rep_id}|${a.appt_date}|${a.appt_time}`)}
              shimmer={shimmerIds.has(a.id)}
            />
          </div>
        ))}
        {loaded && active.length === 0 && <EmptyState message="No appointments here yet." />}

        {completedToday.length > 0 && (
          <div className="pt-4">
            <h3 className="text-label mb-2 ml-1">Completed today</h3>
            <div className="space-y-2.5 opacity-90">
              {completedToday.map((a) => (
                <div key={a.id} className="appt-card-enter">
                  <AppointmentCard
                    appt={a}
                    rep={repMap.get(a.rep_id ?? "")}
                    now={now}
                    editable={user.role === "manager" || a.rep_id === user.id}
                    onStatusChange={(field, v) => setStatus(a, field, v)}
                    onClick={() => openEdit(a)}
                    shimmer={shimmerIds.has(a.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <AppointmentModal
          user={user}
          reps={reps}
          appointment={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => setModalOpen(false)}
          onDeleted={() => setModalOpen(false)}
        />
      )}

      {workflowAppt && (
        <WorkflowModal
          user={user}
          appointment={workflowAppt}
          dealershipSettings={dealershipSettings}
          onClose={() => setWorkflowAppt(null)}
        />
      )}
    </div>
  );
}
