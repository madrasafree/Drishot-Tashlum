// Pure UI helpers for the Teacher Portal — safe to import from both server
// and client components (no server-only dependencies).

import type {
  AttendanceStatus,
  MeetingStatus,
  PortalRole,
} from "@/lib/monday/portal-types";

export const ROLE_LABELS: Record<PortalRole, string> = {
  teacher: "מורה",
  mentor: "מנטור",
  training_manager: "מנהלת הכשרה",
  admin: "אדמין",
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "נוכח",
  absent: "נעדר",
  late: "איחור",
  excused: "מאושר",
  cancelled: "בוטל",
};

export const ATTENDANCE_STATUS_OPTIONS: Array<{
  value: AttendanceStatus;
  label: string;
}> = [
  { value: "present", label: ATTENDANCE_STATUS_LABELS.present },
  { value: "absent", label: ATTENDANCE_STATUS_LABELS.absent },
  { value: "late", label: ATTENDANCE_STATUS_LABELS.late },
  { value: "excused", label: ATTENDANCE_STATUS_LABELS.excused },
  { value: "cancelled", label: ATTENDANCE_STATUS_LABELS.cancelled },
];

/** Full Hebrew date, e.g. "יום שלישי, 3 ביוני 2026". */
export function formatHebrewDate(date: string | null): string {
  if (!date) {
    return "ללא תאריך";
  }

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

/** Compact Hebrew date, e.g. "03.06.26". */
export function formatHebrewDateShort(date: string | null): string {
  if (!date) {
    return "ללא תאריך";
  }

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

export function formatMeetingDateTime(
  date: string | null,
  startTime: string | null,
): string {
  const formatted = formatHebrewDate(date);
  return startTime ? `${formatted}, ${startTime}` : formatted;
}

export function meetingStatusChipClass(status: MeetingStatus): string {
  switch (status) {
    case "completed":
      return "border-[var(--madrasa-green)]/30 bg-lime-50 text-[var(--madrasa-green-dark)]";
    case "cancelled":
      return "border-red-200 bg-red-50 text-red-700";
    case "scheduled":
      return "border-[var(--madrasa-blue)]/30 bg-sky-50 text-[var(--madrasa-blue-dark)]";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

export const CHIP_BASE_CLASS =
  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold";
