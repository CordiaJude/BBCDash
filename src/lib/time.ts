export function combineDateTime(date: string, time: string): Date {
  // date: YYYY-MM-DD, time: HH:MM[:SS]
  const [h, m] = time.split(":").map(Number);
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d;
}

export function minutesUntil(date: string, time: string, now = new Date()): number {
  const target = combineDateTime(date, time);
  return (target.getTime() - now.getTime()) / 60000;
}

export function formatTime12h(time: string): string {
  const [hStr, mStr] = time.split(":");
  let h = Number(hStr);
  const m = Number(mStr);
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatDateShort(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 15-minute increments from 7:00 AM to 8:00 PM (dealership hours), value in HH:MM:SS
export function generateTimeSlots(startHour = 7, endHour = 20): { value: string; label: string }[] {
  const slots: { value: string; label: string }[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === endHour && m > 0) break;
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
      slots.push({ value, label: formatTime12h(`${h}:${m}`) });
    }
  }
  return slots;
}

export function startOfWeekISO(now = new Date()): string {
  const d = new Date(now);
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day;
  d.setDate(diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function endOfWeekISO(now = new Date()): string {
  const d = new Date(now);
  const day = d.getDay();
  const diff = d.getDate() - day + 6;
  d.setDate(diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
