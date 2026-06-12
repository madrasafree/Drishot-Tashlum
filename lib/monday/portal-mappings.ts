// Teacher Portal Monday mappings.
//
// Known board/column IDs are reused from lib/monday/constants.ts.
// Mappings that do not exist yet in the Monday account are typed `null`
// placeholders. Rules:
//   - Never guess a Monday board/column ID.
//   - Real (non-preview) code paths that need an unmapped value must throw
//     PortalConfigurationError with a clear Hebrew message.
//   - Every mapping below is surfaced in /admin/diagnostics via
//     getPortalMappingDiagnostics().
//
// Board IDs can be supplied via environment variables without a deploy
// (see resolution order in `resolveBoardId`).

import { BOARD_IDS } from "@/lib/monday/constants";
import type { MappingDiagnostic } from "@/lib/monday/portal-types";
import { getRuntimeEnv } from "@/lib/runtime-env";

function parseBoardIdEnv(name: string): number | null {
  const raw = getRuntimeEnv(name);
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export const PORTAL_BOARD_IDS = {
  TEACHERS: BOARD_IDS.TEACHERS,
  COURSES: BOARD_IDS.COURSES,
  PRIVATE_LESSONS: BOARD_IDS.PRIVATE_LESSONS,
  PAYMENT_REQUESTS: BOARD_IDS.PAYMENT_REQUESTS,
  SUPPLIERS: BOARD_IDS.SUPPLIERS,
} as const;

/** Meetings board: every lesson is a real Monday item. TODO: set the real board ID. */
export function getMeetingsBoardId(): number | null {
  return parseBoardIdEnv("PORTAL_MEETINGS_BOARD_ID");
}

/** Optional materials/links board. TODO: set the real board ID if one exists. */
export function getMaterialsBoardId(): number | null {
  return parseBoardIdEnv("PORTAL_MATERIALS_BOARD_ID");
}

// --- Teachers board portal columns (board 1179972988) -----------------------
// TODO: create/locate these columns in Monday and fill in the IDs.
export const TEACHER_PORTAL_COLUMNS: Record<
  "APP_ACCESS_STATUS" | "APP_ROLE" | "MENTOR_RELATION",
  string | null
> = {
  /** Status column controlling app access: approved / pending / blocked. */
  APP_ACCESS_STATUS: null,
  /** Status/dropdown column holding the app role (teacher/mentor/training_manager/admin). */
  APP_ROLE: null,
  /** Board relation column linking a teacher to their mentor (another teacher item). */
  MENTOR_RELATION: null,
};

// --- Meetings board columns --------------------------------------------------
// TODO: fill in after the Meetings board ID is known.
export const MEETING_COLUMNS: Record<
  | "COURSE_RELATION"
  | "TEACHER_RELATION"
  | "DATE"
  | "DURATION_MINUTES"
  | "STATUS"
  | "LOCATION"
  | "ZOOM_LINK"
  | "STUDENTS"
  | "ATTENDANCE"
  | "ATTENDANCE_NOTE",
  string | null
> = {
  COURSE_RELATION: null,
  TEACHER_RELATION: null,
  DATE: null,
  DURATION_MINUTES: null,
  STATUS: null,
  LOCATION: null,
  ZOOM_LINK: null,
  /** Relation/people/text column holding the students of the meeting. */
  STUDENTS: null,
  /** Where submitted attendance is stored (model decision pending — see docs). */
  ATTENDANCE: null,
  ATTENDANCE_NOTE: null,
};

// --- Private notebook columns -------------------------------------------------
// Course-level fields live on the Private Lessons board (18082848395),
// per-meeting summaries live on the Meetings board.
// TODO: create/locate these columns and fill in the IDs.
export const PRIVATE_NOTEBOOK_COURSE_COLUMNS: Record<
  "LEARNING_GOALS" | "LANGUAGE_BACKGROUND" | "GENERAL_NOTES",
  string | null
> = {
  LEARNING_GOALS: null,
  LANGUAGE_BACKGROUND: null,
  GENERAL_NOTES: null,
};

export const PRIVATE_NOTEBOOK_MEETING_COLUMNS: Record<
  "TOPICS_COVERED" | "NEW_WORDS_PHRASES" | "HOMEWORK" | "TEACHER_NOTES",
  string | null
> = {
  TOPICS_COVERED: null,
  NEW_WORDS_PHRASES: null,
  HOMEWORK: null,
  TEACHER_NOTES: null,
};

// --- Materials board columns ----------------------------------------------------
// TODO: fill in if/when a materials board ID is configured.
export const MATERIAL_COLUMNS: Record<
  "URL" | "DESCRIPTION" | "CATEGORY" | "AUDIENCE",
  string | null
> = {
  URL: null,
  DESCRIPTION: null,
  CATEGORY: null,
  AUDIENCE: null,
};

export interface MappingRequirement {
  key: string;
  label: string;
  scope: "board" | "column" | "env";
  required: boolean;
  consumers: string;
  getValue: () => string | null;
}

const MAPPING_REQUIREMENTS: MappingRequirement[] = [
  {
    key: "PORTAL_MEETINGS_BOARD_ID",
    label: "לוח מפגשים (Meetings board)",
    scope: "board",
    required: true,
    consumers: "מפגשים, נוכחות, יצוא יומן, מחברת תלמיד",
    getValue: () => {
      const id = getMeetingsBoardId();
      return id ? String(id) : null;
    },
  },
  {
    key: "PORTAL_MATERIALS_BOARD_ID",
    label: "לוח חומרי הדרכה (Materials board)",
    scope: "board",
    required: false,
    consumers: "עמוד חומרים (קיים fallback מקומי)",
    getValue: () => {
      const id = getMaterialsBoardId();
      return id ? String(id) : null;
    },
  },
  ...Object.entries(TEACHER_PORTAL_COLUMNS).map(([key, value]) => ({
    key: `TEACHERS.${key}`,
    label: `לוח מורים — עמודת ${key}`,
    scope: "column" as const,
    required: false,
    consumers: "הרשאות גישה, תפקידים, שיוך מנטור",
    getValue: () => value,
  })),
  ...Object.entries(MEETING_COLUMNS).map(([key, value]) => ({
    key: `MEETINGS.${key}`,
    label: `לוח מפגשים — עמודת ${key}`,
    scope: "column" as const,
    required: true,
    consumers: "מפגשים, נוכחות, יצוא יומן",
    getValue: () => value,
  })),
  ...Object.entries(PRIVATE_NOTEBOOK_COURSE_COLUMNS).map(([key, value]) => ({
    key: `NOTEBOOK_COURSE.${key}`,
    label: `מחברת תלמיד (רמת קורס) — עמודת ${key}`,
    scope: "column" as const,
    required: false,
    consumers: "מחברת תלמיד פרטי",
    getValue: () => value,
  })),
  ...Object.entries(PRIVATE_NOTEBOOK_MEETING_COLUMNS).map(([key, value]) => ({
    key: `NOTEBOOK_MEETING.${key}`,
    label: `מחברת תלמיד (רמת מפגש) — עמודת ${key}`,
    scope: "column" as const,
    required: false,
    consumers: "מחברת תלמיד פרטי",
    getValue: () => value,
  })),
  ...Object.entries(MATERIAL_COLUMNS).map(([key, value]) => ({
    key: `MATERIALS.${key}`,
    label: `לוח חומרים — עמודת ${key}`,
    scope: "column" as const,
    required: false,
    consumers: "עמוד חומרים",
    getValue: () => value,
  })),
];

export function getPortalMappingDiagnostics(): MappingDiagnostic[] {
  return MAPPING_REQUIREMENTS.map((requirement) => {
    const value = requirement.getValue();

    return {
      key: requirement.key,
      label: requirement.label,
      scope: requirement.scope,
      required: requirement.required,
      configured: Boolean(value),
      value,
      consumers: requirement.consumers,
    };
  });
}

export function getMissingRequiredMappings(): MappingDiagnostic[] {
  return getPortalMappingDiagnostics().filter(
    (diagnostic) => diagnostic.required && !diagnostic.configured,
  );
}
