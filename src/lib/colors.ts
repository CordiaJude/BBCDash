// Restrained, dealership-floor-legible palette. Assigned in order as reps are added.
// Chosen to read clearly on dark glass panels and under bright showroom lights,
// without drifting into neon or washed-out pastel territory.
export const REP_COLOR_PALETTE = [
  "#4F8EF7", // blue
  "#E0654F", // terracotta
  "#3FB88A", // emerald
  "#C99A3C", // amber/gold
  "#9D6FE0", // violet
  "#3FAFC2", // teal
  "#E0578C", // rose
  "#7C9C4A", // olive
] as const;

export function nextAvailableColor(usedColors: string[]): string {
  const used = new Set(usedColors);
  const free = REP_COLOR_PALETTE.find((c) => !used.has(c));
  return free ?? REP_COLOR_PALETTE[usedColors.length % REP_COLOR_PALETTE.length];
}
