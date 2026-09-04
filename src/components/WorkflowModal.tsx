"use client";

import { useMemo, useState } from "react";
import type { Appointment, DealershipSettings, SessionUser, WorkflowStepRow } from "@/lib/types";
import { useWorkflowSteps } from "@/lib/useLiveData";
import { APPRAISAL_STEPS, EXIT_REASONS, MGM_STEPS, StepDef } from "@/lib/workflowSteps";

function stepData(steps: WorkflowStepRow[], key: string): Record<string, unknown> {
  return steps.find((s) => s.step_key === key)?.data ?? {};
}
function isDone(steps: WorkflowStepRow[], key: string): boolean {
  return Boolean(steps.find((s) => s.step_key === key)?.completed_at);
}

async function postStep(appointmentId: string, stepKey: string, completed: boolean, data: Record<string, unknown>) {
  await fetch(`/api/appointments/${appointmentId}/workflow/steps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step_key: stepKey, completed, data }),
  });
}

async function patchAppointment(appointmentId: string, update: Record<string, unknown>) {
  await fetch(`/api/appointments/${appointmentId}/workflow`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
}

export function WorkflowModal({
  user,
  appointment,
  dealershipSettings,
  onClose,
}: {
  user: SessionUser;
  appointment: Appointment;
  dealershipSettings: DealershipSettings | null;
  onClose: () => void;
}) {
  const isManager = user.role === "manager";
  const { steps } = useWorkflowSteps(appointment.id);
  const [allowSkipAhead, setAllowSkipAhead] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [exitReason, setExitReason] = useState<string>(EXIT_REASONS[0]);
  const [exitReasonOther, setExitReasonOther] = useState("");
  const [purchasePrompt, setPurchasePrompt] = useState(false);
  const [boughtPrice, setBoughtPrice] = useState(appointment.bought_price?.toString() ?? "");

  const mgmDone = MGM_STEPS.every((s) => isDone(steps, s.key));
  const appraisalUnlocked = mgmDone || allowSkipAhead || appointment.workflow_status === "appraisal_in_progress" || appointment.workflow_status === "completed_purchase";

  const lastCompleted = useMemo(() => {
    const all = [...MGM_STEPS, ...APPRAISAL_STEPS];
    let last: StepDef | null = null;
    for (const s of all) {
      if (isDone(steps, s.key)) last = s;
    }
    return last;
  }, [steps]);

  function canCheck(list: StepDef[], step: StepDef): boolean {
    if (isManager || allowSkipAhead) return true;
    const idx = list.findIndex((s) => s.key === step.key);
    if (idx === 0) return true;
    return isDone(steps, list[idx - 1].key);
  }

  async function completeStep(list: StepDef[], step: StepDef, data: Record<string, unknown> = {}) {
    await postStep(appointment.id, step.key, true, data);
    if (step.key === "mgm_1" && appointment.showed_status === "pending") {
      await patchAppointment(appointment.id, { showed_status: "yes" });
    }
    if (appointment.workflow_status === "not_started") {
      await patchAppointment(appointment.id, { workflow_status: "mgm_in_progress" });
    }
    if (list === MGM_STEPS && step.key === "mgm_4" && appointment.workflow_status !== "appraisal_in_progress") {
      await patchAppointment(appointment.id, { workflow_status: "appraisal_in_progress" });
    }
  }

  async function uncheckStep(step: StepDef) {
    await postStep(appointment.id, step.key, false, stepData(steps, step.key));
  }

  async function submitExit() {
    const reason = exitReason === "Other" ? exitReasonOther || "Other" : exitReason;
    await patchAppointment(appointment.id, {
      workflow_status: "exited",
      exit_step: lastCompleted?.key ?? "none",
      exit_reason: reason,
      showed_status: "yes",
    });
    setExiting(false);
    onClose();
  }

  async function confirmPurchase() {
    if (!boughtPrice) return;
    await postStep(appointment.id, "appraisal_9", true, { bought_price: Number(boughtPrice) });
    await patchAppointment(appointment.id, {
      bought_price: Number(boughtPrice),
      sold_status: "yes",
      showed_status: "yes",
      workflow_status: "completed_purchase",
    });
    setPurchasePrompt(false);
    onClose();
  }

  const totalSteps = MGM_STEPS.length + APPRAISAL_STEPS.length;
  const doneCount = [...MGM_STEPS, ...APPRAISAL_STEPS].filter((s) => isDone(steps, s.key)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 modal-backdrop-in" onClick={onClose}>
      <div
        className="panel-strong w-full max-w-2xl max-h-[92dvh] overflow-y-auto p-5 sm:p-6 modal-panel-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <h2 className="text-headline text-xl truncate">{appointment.customer_name}</h2>
            <p className="text-secondary text-sm truncate">{appointment.vehicle}</p>
          </div>
          <button onClick={onClose} aria-label="Close (saves progress)" className="icon-btn-round shrink-0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="field h-2 mb-1 overflow-hidden p-0">
          <div
            className="h-full bg-[var(--accent)] transition-all"
            style={{ width: `${Math.round((doneCount / totalSteps) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-[var(--foreground-muted)] mb-5">
          {doneCount} of {totalSteps} steps · closing this panel saves your progress
        </p>

        <PhaseSection
          title="Phase 1 — MGM"
          list={MGM_STEPS}
          steps={steps}
          canCheck={canCheck}
          onComplete={completeStep}
          onUncheck={uncheckStep}
          appointment={appointment}
        />

        <div className={appraisalUnlocked ? "" : "opacity-50 pointer-events-none select-none"}>
          <PhaseSection
            title="Phase 2 — Appraisal"
            list={APPRAISAL_STEPS}
            steps={steps}
            canCheck={canCheck}
            onComplete={completeStep}
            onUncheck={uncheckStep}
            appointment={appointment}
            dealershipSettings={dealershipSettings}
            onPurchaseCheck={() => setPurchasePrompt(true)}
          />
          {!appraisalUnlocked && (
            <p className="text-xs text-[var(--foreground-muted)] -mt-3 mb-4">Complete Phase 1 (MGM) to unlock.</p>
          )}
        </div>

        {isManager && !appraisalUnlocked && (
          <label className="flex items-center gap-2 text-xs text-[var(--foreground-muted)] mb-4">
            <input type="checkbox" checked={allowSkipAhead} onChange={(e) => setAllowSkipAhead(e.target.checked)} />
            Manager override: unlock Appraisal without finishing MGM
          </label>
        )}

        <div className="flex items-center justify-between pt-4 mt-2 border-t border-[var(--border)]">
          <button onClick={() => setExiting(true)} className="text-sm text-[var(--bad)] hover:underline">
            Exit workflow
          </button>
          <div className="flex gap-2 text-xs text-[var(--foreground-faint)]">
            <ManualOverride appointment={appointment} />
          </div>
        </div>
      </div>

      {exiting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/55" onClick={() => setExiting(false)}>
          <div className="panel-strong w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-headline text-lg mb-1">Exit this workflow?</h3>
            <p className="text-sm text-[var(--foreground-muted)] mb-4">
              Last completed: <span className="font-medium text-[var(--foreground)]">{lastCompleted ? lastCompleted.label : "none"}</span>.
              This marks the appointment as showed but not sold, and records exactly where it dropped off.
            </p>
            <label className="block text-xs uppercase tracking-wide text-[var(--foreground-muted)] mb-1">Reason</label>
            <select
              className="field w-full px-3 py-2 mb-2"
              value={exitReason}
              onChange={(e) => setExitReason(e.target.value)}
            >
              {EXIT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {exitReason === "Other" && (
              <input
                className="field w-full px-3 py-2 mb-2"
                placeholder="What happened?"
                value={exitReasonOther}
                onChange={(e) => setExitReasonOther(e.target.value)}
              />
            )}
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setExiting(false)} className="field px-4 py-2 text-sm">
                Cancel
              </button>
              <button onClick={submitExit} className="px-4 py-2 text-sm rounded-2xl font-medium bg-[var(--bad)] text-white">
                Confirm exit
              </button>
            </div>
          </div>
        </div>
      )}

      {purchasePrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/55" onClick={() => setPurchasePrompt(false)}>
          <div className="panel-strong w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-headline text-lg mb-3">Bought price</h3>
            <input
              type="number"
              inputMode="decimal"
              autoFocus
              className="field w-full px-3 py-2 tabular mb-4"
              placeholder="Final purchase price"
              value={boughtPrice}
              onChange={(e) => setBoughtPrice(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setPurchasePrompt(false)} className="field px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={confirmPurchase}
                disabled={!boughtPrice}
                className="px-4 py-2 text-sm rounded-2xl font-medium bg-[var(--accent)] text-white disabled:opacity-50"
              >
                Confirm purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ManualOverride({ appointment }: { appointment: Appointment }) {
  async function setManual(field: "showed_status" | "sold_status", value: "yes" | "no") {
    await fetch(`/api/appointments/${appointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  }
  return (
    <div className="flex items-center gap-3">
      <span>Manual override:</span>
      <button className="hover:underline" onClick={() => setManual("showed_status", "yes")}>
        Mark showed
      </button>
      <button className="hover:underline" onClick={() => setManual("sold_status", "yes")}>
        Mark sold
      </button>
      <button className="hover:underline" onClick={() => setManual("sold_status", "no")}>
        Mark not sold
      </button>
    </div>
  );
}

function PhaseSection({
  title,
  list,
  steps,
  canCheck,
  onComplete,
  onUncheck,
  appointment,
  dealershipSettings,
  onPurchaseCheck,
}: {
  title: string;
  list: StepDef[];
  steps: WorkflowStepRow[];
  canCheck: (list: StepDef[], step: StepDef) => boolean;
  onComplete: (list: StepDef[], step: StepDef, data?: Record<string, unknown>) => void;
  onUncheck: (step: StepDef) => void;
  appointment: Appointment;
  dealershipSettings?: DealershipSettings | null;
  onPurchaseCheck?: () => void;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-headline text-base mb-3">{title}</h3>
      <div className="space-y-2.5">
        {list.map((step) => (
          <StepRow
            key={step.key}
            list={list}
            step={step}
            steps={steps}
            enabled={canCheck(list, step)}
            onComplete={onComplete}
            onUncheck={onUncheck}
            appointment={appointment}
            dealershipSettings={dealershipSettings}
            onPurchaseCheck={onPurchaseCheck}
          />
        ))}
      </div>
    </div>
  );
}

function StepRow({
  list,
  step,
  steps,
  enabled,
  onComplete,
  onUncheck,
  appointment,
  dealershipSettings,
  onPurchaseCheck,
}: {
  list: StepDef[];
  step: StepDef;
  steps: WorkflowStepRow[];
  enabled: boolean;
  onComplete: (list: StepDef[], step: StepDef, data?: Record<string, unknown>) => void;
  onUncheck: (step: StepDef) => void;
  appointment: Appointment;
  dealershipSettings?: DealershipSettings | null;
  onPurchaseCheck?: () => void;
}) {
  const done = isDone(steps, step.key);
  const data = stepData(steps, step.key);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState((data.note as string) ?? (data.reaction as string) ?? (data.codes as string) ?? "");
  const [payoffAmt, setPayoffAmt] = useState(appointment.payoff_amount?.toString() ?? "");
  const [titleChoice, setTitleChoice] = useState<"clear" | "payoff">(appointment.title_status ?? "clear");
  const [kbb, setKbb] = useState((data.kbb_ico as string) ?? "");
  const [establishedValue, setEstablishedValue] = useState((data.established_value as string) ?? "");
  const [answers, setAnswers] = useState<string[]>(
    Array.isArray(data.answers) ? (data.answers as string[]) : ["", "", ""]
  );
  const [uploading, setUploading] = useState(false);
  const photoUrls: string[] = Array.isArray(data.photo_urls) ? (data.photo_urls as string[]) : [];

  function toggle() {
    if (!enabled) return;
    if (done) {
      onUncheck(step);
      return;
    }
    if (step.key === "appraisal_9") {
      onPurchaseCheck?.();
      return;
    }
    if (step.key === "mgm_3") {
      onComplete(list, step, { title_status: titleChoice, payoff_amount: titleChoice === "payoff" ? Number(payoffAmt || 0) : null });
      return;
    }
    onComplete(list, step);
  }

  const questions =
    dealershipSettings?.return_drive_questions?.length === 3
      ? dealershipSettings.return_drive_questions
      : ["Question 1", "Question 2", "Question 3"];
  const questionsMissing = !dealershipSettings || dealershipSettings.return_drive_questions?.length !== 3;

  return (
    <div className={`field p-3.5 ${!enabled ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={!enabled}
          onClick={toggle}
          aria-label={done ? `${step.label}: completed` : `Complete: ${step.label}`}
          className="shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:cursor-not-allowed"
          style={{
            background: done ? "var(--ok)" : "transparent",
            boxShadow: done ? "none" : "0 0 0 1.5px var(--pending-outline) inset",
          }}
        >
          {done && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ok-icon)" strokeWidth="3">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            disabled={!enabled}
            onClick={toggle}
            className="text-left text-sm font-medium disabled:cursor-not-allowed"
          >
            {step.index}. {step.label}
          </button>

          {step.key === "mgm_2" && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="block text-xs text-[var(--accent)] mt-1"
            >
              {expanded ? "Hide" : "Show"} original mileage/condition/damage/notes
            </button>
          )}
          {step.key === "mgm_2" && expanded && (
            <div className="mt-2 text-xs text-[var(--foreground-muted)] space-y-0.5 field p-2">
              <p>Vehicle: {appointment.vehicle}</p>
              <p>Notes: {appointment.notes || "none on file"}</p>
            </div>
          )}

          {step.key === "mgm_3" && !done && enabled && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="flex field p-0.5 gap-0.5">
                {(["clear", "payoff"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setTitleChoice(v)}
                    className={`px-2.5 py-1 rounded-[calc(var(--radius-md)-0.25rem)] text-xs font-medium ${
                      titleChoice === v ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--hover-surface)]"
                    }`}
                  >
                    {v === "clear" ? "Clear Title" : "Has Payoff"}
                  </button>
                ))}
              </div>
              {titleChoice === "payoff" && (
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Payoff amount"
                  value={payoffAmt}
                  onChange={(e) => setPayoffAmt(e.target.value)}
                  className="field px-2 py-1 text-xs tabular w-32"
                />
              )}
            </div>
          )}
          {step.key === "mgm_3" && done && (
            <p className="text-xs text-[var(--foreground-muted)] mt-1">
              {(data.title_status as string) === "payoff" ? `Has payoff · $${data.payoff_amount ?? "?"}` : "Clear title"}
            </p>
          )}

          {step.key === "mgm_4" && (
            <div className="mt-1.5 text-xs text-[var(--foreground-muted)]">
              <p>
                Market: {appointment.market_indicates_min != null ? `$${appointment.market_indicates_min}` : "?"}
                {appointment.market_indicates_max != null ? ` – $${appointment.market_indicates_max}` : ""} · Asking:{" "}
                {appointment.asking_price != null ? `$${appointment.asking_price}` : "not set"}
              </p>
              {!done && enabled && (
                <input
                  placeholder="Customer's reaction (optional)"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="field px-2 py-1 text-xs w-full mt-1.5"
                  onBlur={() => postStep(appointment.id, step.key, false, { reaction: text })}
                />
              )}
            </div>
          )}

          {step.key === "appraisal_1" && !done === false && photoUrls.length > 0 && (
            <p className="text-xs text-[var(--foreground-muted)] mt-1">{photoUrls.length} photo(s) uploaded</p>
          )}
          {step.key === "appraisal_1" && enabled && (
            <label className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] mt-1.5 cursor-pointer">
              {uploading ? "Uploading…" : "Add photo"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  const form = new FormData();
                  form.append("file", file);
                  await fetch(`/api/appointments/${appointment.id}/workflow/photos`, { method: "POST", body: form });
                  setUploading(false);
                  e.target.value = "";
                }}
              />
            </label>
          )}

          {step.key === "appraisal_2" && !done && enabled && (
            <textarea
              placeholder="Anything undisclosed found? Leave blank if none."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="field px-2 py-1.5 text-xs w-full mt-1.5 min-h-14"
            />
          )}
          {step.key === "appraisal_2" && !done && enabled && (
            <button
              onClick={() => onComplete(list, step, { note: text })}
              className="text-xs text-[var(--accent)] mt-1 hover:underline"
            >
              Confirm (even if nothing found)
            </button>
          )}
          {step.key === "appraisal_2" && done && (data.note as string) && (
            <p className="text-xs text-[var(--foreground-muted)] mt-1">{data.note as string}</p>
          )}

          {step.key === "appraisal_3" && !done && enabled && (
            <textarea
              placeholder="Codes/results found (optional)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="field px-2 py-1.5 text-xs w-full mt-1.5 min-h-12"
            />
          )}
          {step.key === "appraisal_3" && !done && enabled && (
            <button
              onClick={() => onComplete(list, step, { codes: text })}
              className="text-xs text-[var(--accent)] mt-1 hover:underline"
            >
              Confirm scan run
            </button>
          )}
          {step.key === "appraisal_3" && done && (data.codes as string) && (
            <p className="text-xs text-[var(--foreground-muted)] mt-1">{data.codes as string}</p>
          )}

          {step.key === "appraisal_6" && (
            <div className="mt-2 space-y-1.5">
              {questionsMissing && (
                <p className="text-xs text-[var(--bad)]">
                  Return-drive questions haven&rsquo;t been set up yet — a manager needs to configure them in Settings.
                </p>
              )}
              {questions.map((q, i) => (
                <input
                  key={i}
                  placeholder={q}
                  value={answers[i]}
                  disabled={!enabled}
                  onChange={(e) => setAnswers((a) => a.map((v, idx) => (idx === i ? e.target.value : v)))}
                  className="field px-2 py-1 text-xs w-full"
                />
              ))}
              {!done && enabled && (
                <button
                  onClick={() => onComplete(list, step, { answers, questions })}
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  Confirm answers
                </button>
              )}
            </div>
          )}

          {step.key === "appraisal_7" && !done && enabled && (
            <input
              type="number"
              inputMode="decimal"
              placeholder="Updated KBB ICO figure"
              value={kbb}
              onChange={(e) => setKbb(e.target.value)}
              className="field px-2 py-1 text-xs w-full mt-1.5 tabular"
            />
          )}
          {step.key === "appraisal_7" && !done && enabled && (
            <button
              onClick={() => onComplete(list, step, { kbb_ico: kbb })}
              disabled={!kbb}
              className="text-xs text-[var(--accent)] mt-1 hover:underline disabled:opacity-40"
            >
              Confirm
            </button>
          )}
          {step.key === "appraisal_7" && done && (
            <p className="text-xs text-[var(--foreground-muted)] mt-1 tabular">KBB ICO: ${data.kbb_ico as string}</p>
          )}

          {step.key === "appraisal_8" && !done && enabled && (
            <input
              type="number"
              inputMode="decimal"
              placeholder="Established value (agreed with manager)"
              value={establishedValue}
              onChange={(e) => setEstablishedValue(e.target.value)}
              className="field px-2 py-1 text-xs w-full mt-1.5 tabular"
            />
          )}
          {step.key === "appraisal_8" && !done && enabled && (
            <button
              onClick={() => onComplete(list, step, { established_value: establishedValue })}
              disabled={!establishedValue}
              className="text-xs text-[var(--accent)] mt-1 hover:underline disabled:opacity-40"
            >
              Confirm manager handoff
            </button>
          )}
          {step.key === "appraisal_8" && done && (
            <p className="text-xs text-[var(--foreground-muted)] mt-1 tabular">
              Established value: ${data.established_value as string}
            </p>
          )}

          {step.key === "appraisal_9" && done && (
            <p className="text-xs text-[var(--ok-icon)] mt-1 tabular">Purchased for ${data.bought_price as string}</p>
          )}
        </div>
      </div>
    </div>
  );
}
