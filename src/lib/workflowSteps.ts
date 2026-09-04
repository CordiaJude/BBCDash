export type Phase = "mgm" | "appraisal";

export interface StepDef {
  key: string;
  phase: Phase;
  index: number; // 1-based within its phase, matches the spec's step numbers
  label: string;
}

export const MGM_STEPS: StepDef[] = [
  { key: "mgm_1", phase: "mgm", index: 1, label: "Meet & Greet" },
  { key: "mgm_2", phase: "mgm", index: 2, label: "Walk back vehicle details" },
  { key: "mgm_3", phase: "mgm", index: 3, label: "Confirm title or payoff status" },
  { key: "mgm_4", phase: "mgm", index: 4, label: "Present market numbers & ask to buy today" },
];

export const APPRAISAL_STEPS: StepDef[] = [
  { key: "appraisal_1", phase: "appraisal", index: 1, label: "Take photos" },
  { key: "appraisal_2", phase: "appraisal", index: 2, label: "Note undisclosed condition items" },
  { key: "appraisal_3", phase: "appraisal", index: 3, label: "Run OBD2/FIXD scan" },
  { key: "appraisal_4", phase: "appraisal", index: 4, label: "Walkaround" },
  { key: "appraisal_5", phase: "appraisal", index: 5, label: "Test drive" },
  { key: "appraisal_6", phase: "appraisal", index: 6, label: "Three return-drive questions" },
  { key: "appraisal_7", phase: "appraisal", index: 7, label: "Redo Kelly Blue Book Instant Cash Offer" },
  { key: "appraisal_8", phase: "appraisal", index: 8, label: "Establish value & management handoff" },
  { key: "appraisal_9", phase: "appraisal", index: 9, label: "Purchase" },
];

export const ALL_STEPS: StepDef[] = [...MGM_STEPS, ...APPRAISAL_STEPS];

export function stepLabel(stepKey: string | null): string {
  if (!stepKey) return "—";
  const found = ALL_STEPS.find((s) => s.key === stepKey);
  return found ? `${found.phase === "mgm" ? "MGM" : "Appraisal"} ${found.index} — ${found.label}` : stepKey;
}

export const EXIT_REASONS = [
  "Price gap too wide",
  "Customer needed time",
  "Vehicle condition issue",
  "Other",
] as const;
