export type Role = "rep" | "manager";
export type TriState = "pending" | "yes" | "no";
export type LayoutMode = "single_list" | "columns_per_rep" | "columns_by_status";
export type CrmLabel = "VAN" | "DealerCentric";
export type AlertSound = "chime" | "bell" | "soft_ping";

export interface Rep {
  id: string;
  email: string;
  display_name: string;
  role: Role;
  color_hex: string;
  photo_url: string | null;
  active: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  rep_id: string;
  customer_name: string;
  vehicle: string;
  appt_date: string; // YYYY-MM-DD
  appt_time: string; // HH:MM:SS
  confirmed_status: TriState;
  showed_status: TriState;
  sold_status: TriState;
  appraisal_link: string | null;
  vauto_link: string | null;
  crm_link: string | null;
  crm_label: CrmLabel | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TvSettings {
  id: number;
  layout_mode: LayoutMode;
  alerts_enabled: boolean;
  alert_sound: AlertSound;
  alert_offsets_minutes: number[];
  updated_by: string | null;
  updated_at: string;
}

export interface SessionUser {
  id: string;
  email: string;
  display_name: string;
  role: Role;
  color_hex: string;
}
