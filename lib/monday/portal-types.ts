// Normalized app-level types for the Teacher Portal.
// These are the contracts between the Monday service layer (lib/monday/*)
// and the portal UI (app/(portal)/*). UI components must never see raw
// Monday GraphQL shapes.

export type PortalRole = "teacher" | "mentor" | "training_manager" | "admin";

export type AppAccessStatus = "approved" | "pending" | "blocked" | "unknown";

export interface CurrentUser {
  /** Canonical identity: Monday item_id on the Teachers board. */
  teacherItemId: number;
  email: string;
  name: string;
  role: PortalRole;
  appAccessStatus: AppAccessStatus;
  isActive: boolean;
  /** Teacher item ids assigned to this user when role is mentor. */
  mentorTeacherIds: number[];
  supplierRelationId: number | null;
  supplierFileStatus: string;
  source: "cloudflare" | "preview";
}

export type CurrentUserFailureReason =
  | "unauthenticated"
  | "not_found"
  | "duplicate_email"
  | "pending"
  | "blocked"
  | "inactive"
  | "config_error"
  | "monday_error";

export type CurrentUserResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; reason: CurrentUserFailureReason; message?: string };

export interface PortalTeacher {
  itemId: number;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  supplierFileStatus: string;
  appAccessStatus: AppAccessStatus;
  role: PortalRole | null;
  mentorItemId: number | null;
}

export type PortalCourseKind = "course" | "private_lessons";

export interface PortalCourse {
  itemId: number;
  name: string;
  kind: PortalCourseKind;
  state: string;
  startDate: string | null;
  endDate: string | null;
  lessonsCount: number | null;
  teacherItemIds: number[];
  teacherNames: string[];
  location: string | null;
  zoomLink: string | null;
  /** Private-lesson products only. */
  studentName: string | null;
}

export type MeetingStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "unknown";

export interface PortalMeeting {
  itemId: number;
  name: string;
  courseItemId: number | null;
  courseName: string | null;
  teacherItemIds: number[];
  /** ISO date (YYYY-MM-DD). */
  date: string | null;
  /** HH:mm when available. */
  startTime: string | null;
  durationMinutes: number | null;
  status: MeetingStatus;
  statusLabel: string;
  location: string | null;
  zoomLink: string | null;
  attendanceSubmitted: boolean;
}

export interface MeetingStudent {
  id: string;
  name: string;
}

export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "excused"
  | "cancelled";

export interface AttendanceEntry {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  note?: string;
}

export interface AttendancePayload {
  meetingItemId: number;
  entries: AttendanceEntry[];
  generalNote?: string;
  /** Set server-side from the authenticated user; never trusted from client. */
  submittedByTeacherItemId: number;
}

export interface AttendanceSubmitResult {
  ok: boolean;
  storedInMonday: boolean;
  message: string;
}

export interface PrivateNotebookMeetingSummary {
  meetingItemId: number;
  date: string | null;
  topicsCovered: string;
  newWordsPhrases: string;
  homework: string;
  teacherNotes: string;
}

export interface PrivateCourseNotebook {
  courseItemId: number;
  studentName: string;
  teacherName: string;
  learningGoals: string;
  languageBackground: string;
  generalNotes: string;
  meetingSummaries: PrivateNotebookMeetingSummary[];
  /** False when notebook fields are not mapped in Monday yet (preview/mock only). */
  storedInMonday: boolean;
}

export interface NotebookCourseUpdate {
  learningGoals?: string;
  languageBackground?: string;
  generalNotes?: string;
}

export interface NotebookMeetingUpdate {
  topicsCovered?: string;
  newWordsPhrases?: string;
  homework?: string;
  teacherNotes?: string;
}

export interface MaterialLink {
  id: string;
  title: string;
  description: string | null;
  url: string;
  category: string;
}

export interface MappingDiagnostic {
  key: string;
  label: string;
  scope: "board" | "column" | "env";
  required: boolean;
  configured: boolean;
  value: string | null;
  consumers: string;
}

export class PortalConfigurationError extends Error {
  missingMappings: string[];

  constructor(message: string, missingMappings: string[] = []) {
    super(message);
    this.name = "PortalConfigurationError";
    this.missingMappings = missingMappings;
  }
}
