// Portal teacher services. Server-side only.
// Reads the Teachers board (existing board, see lib/monday/constants.ts) and
// normalizes items into PortalTeacher. Unmapped portal columns (app access,
// role, mentor) degrade to safe defaults and are reported in diagnostics.

import { unstable_cache } from "next/cache";

import { fetchQuery } from "@/lib/monday/client";
import { BOARD_IDS, TEACHER_COLUMNS } from "@/lib/monday/constants";
import { isMondayPreviewMode } from "@/lib/monday/mock";
import { TEACHER_PORTAL_COLUMNS } from "@/lib/monday/portal-mappings";
import {
  getMockPortalTeacherByItemId,
  getMockPortalTeachers,
  getMockPortalTeachersByEmail,
  getMockTeachersForMentor,
} from "@/lib/monday/portal-mock";
import type { AppAccessStatus, PortalRole, PortalTeacher } from "@/lib/monday/portal-types";

type TeacherColumnValue = {
  id: string;
  text: string | null;
  label?: string | null;
  email?: string | null;
  linked_item_ids?: string[];
};

type TeacherItemResponse = {
  id: string;
  name: string;
  column_values: TeacherColumnValue[];
};

type TeachersBoardResponse = {
  boards: Array<{
    items_page: {
      cursor?: string | null;
      items: TeacherItemResponse[];
    };
  }>;
};

const APP_ACCESS_LABELS: Record<string, AppAccessStatus> = {
  מאושר: "approved",
  approved: "approved",
  ממתין: "pending",
  "ממתין לאישור": "pending",
  pending: "pending",
  חסום: "blocked",
  blocked: "blocked",
};

const APP_ROLE_LABELS: Record<string, PortalRole> = {
  teacher: "teacher",
  מורה: "teacher",
  mentor: "mentor",
  מנטור: "mentor",
  "מלווה פדגוגי": "mentor",
  training_manager: "training_manager",
  "מנהלת הכשרה": "training_manager",
  "מנהל הכשרה": "training_manager",
  admin: "admin",
  אדמין: "admin",
  "מנהל מערכת": "admin",
};

export function parseAppAccessLabel(label: string | null | undefined): AppAccessStatus {
  if (!label) {
    return "unknown";
  }

  return APP_ACCESS_LABELS[label.trim().toLowerCase()] ?? APP_ACCESS_LABELS[label.trim()] ?? "unknown";
}

export function parseAppRoleLabel(label: string | null | undefined): PortalRole | null {
  if (!label) {
    return null;
  }

  return APP_ROLE_LABELS[label.trim().toLowerCase()] ?? APP_ROLE_LABELS[label.trim()] ?? null;
}

function getPortalTeacherColumnIds(): string[] {
  const baseColumns = [
    TEACHER_COLUMNS.EMAIL,
    TEACHER_COLUMNS.PHONE,
    TEACHER_COLUMNS.ACTIVE_STATUS,
    TEACHER_COLUMNS.SUPPLIER_RELATION,
    TEACHER_COLUMNS.SUPPLIER_FILE_STATUS,
  ];

  const portalColumns = Object.values(TEACHER_PORTAL_COLUMNS).filter(
    (columnId): columnId is string => Boolean(columnId),
  );

  return [...baseColumns, ...portalColumns];
}

function getColumn(item: TeacherItemResponse, columnId: string | null) {
  if (!columnId) {
    return undefined;
  }

  return item.column_values.find((column) => column.id === columnId);
}

function parsePortalTeacher(item: TeacherItemResponse): PortalTeacher {
  const emailColumn = getColumn(item, TEACHER_COLUMNS.EMAIL);
  const accessColumn = getColumn(item, TEACHER_PORTAL_COLUMNS.APP_ACCESS_STATUS);
  const roleColumn = getColumn(item, TEACHER_PORTAL_COLUMNS.APP_ROLE);
  const mentorColumn = getColumn(item, TEACHER_PORTAL_COLUMNS.MENTOR_RELATION);
  const mentorLinkedId = mentorColumn?.linked_item_ids?.[0];

  return {
    itemId: Number(item.id),
    name: item.name,
    email: (emailColumn?.email || emailColumn?.text || "").trim(),
    phone: getColumn(item, TEACHER_COLUMNS.PHONE)?.text || null,
    isActive: true,
    supplierFileStatus:
      getColumn(item, TEACHER_COLUMNS.SUPPLIER_FILE_STATUS)?.label ||
      getColumn(item, TEACHER_COLUMNS.SUPPLIER_FILE_STATUS)?.text ||
      "",
    // Unmapped access column => "unknown"; the auth layer treats unknown as
    // approved-for-active-teachers until the Monday mapping exists.
    appAccessStatus: TEACHER_PORTAL_COLUMNS.APP_ACCESS_STATUS
      ? parseAppAccessLabel(accessColumn?.label || accessColumn?.text)
      : "unknown",
    role: TEACHER_PORTAL_COLUMNS.APP_ROLE
      ? parseAppRoleLabel(roleColumn?.label || roleColumn?.text)
      : null,
    mentorItemId: mentorLinkedId ? Number(mentorLinkedId) : null,
  };
}

const COLUMN_FIELDS = `
  id
  text
  ... on StatusValue {
    label
  }
  ... on EmailValue {
    email
  }
  ... on BoardRelationValue {
    linked_item_ids
  }
`;

const getActivePortalTeachersCached = unstable_cache(
  async (): Promise<PortalTeacher[]> => {
    const query = `
      query GetActivePortalTeachers($boardId: [ID!], $columnIds: [String!]) {
        boards(ids: $boardId) {
          items_page(
            limit: 500
            query_params: {
              rules: [
                {
                  column_id: "${TEACHER_COLUMNS.ACTIVE_STATUS}"
                  compare_value: [1]
                  operator: any_of
                }
              ]
            }
          ) {
            items {
              id
              name
              column_values(ids: $columnIds) {
                ${COLUMN_FIELDS}
              }
            }
          }
        }
      }
    `;

    const response = await fetchQuery<TeachersBoardResponse>(query, {
      boardId: [BOARD_IDS.TEACHERS],
      columnIds: getPortalTeacherColumnIds(),
    });

    return (response.boards[0]?.items_page.items || []).map(parsePortalTeacher);
  },
  ["portal-active-teachers"],
  { revalidate: 60 },
);

export async function getAllPortalTeachers(): Promise<PortalTeacher[]> {
  if (isMondayPreviewMode()) {
    return getMockPortalTeachers();
  }

  return getActivePortalTeachersCached();
}

/**
 * Returns every active teacher matching the email (case-insensitive).
 * More than one result means a duplicate email that must block login.
 */
export async function getPortalTeachersByEmail(email: string): Promise<PortalTeacher[]> {
  const normalized = email.trim().toLowerCase();

  if (!normalized) {
    return [];
  }

  if (isMondayPreviewMode()) {
    return getMockPortalTeachersByEmail(normalized);
  }

  const teachers = await getActivePortalTeachersCached();
  return teachers.filter((teacher) => teacher.email.toLowerCase() === normalized);
}

export async function getPortalTeacherByItemId(itemId: number): Promise<PortalTeacher | null> {
  if (isMondayPreviewMode()) {
    return getMockPortalTeacherByItemId(itemId);
  }

  const teachers = await getActivePortalTeachersCached();
  return teachers.find((teacher) => teacher.itemId === itemId) ?? null;
}

/**
 * Teachers assigned to a mentor. Requires the MENTOR_RELATION mapping;
 * returns an empty list when unmapped (surfaced in /admin/diagnostics).
 */
export async function getTeachersForMentor(mentorItemId: number): Promise<PortalTeacher[]> {
  if (isMondayPreviewMode()) {
    return getMockTeachersForMentor(mentorItemId);
  }

  if (!TEACHER_PORTAL_COLUMNS.MENTOR_RELATION) {
    return [];
  }

  const teachers = await getActivePortalTeachersCached();
  return teachers.filter((teacher) => teacher.mentorItemId === mentorItemId);
}

/** Emails that appear on more than one active teacher item (admin diagnostics). */
export async function getDuplicateTeacherEmails(): Promise<
  Array<{ email: string; teachers: Array<{ itemId: number; name: string }> }>
> {
  const teachers = await getAllPortalTeachers();
  const byEmail = new Map<string, PortalTeacher[]>();

  for (const teacher of teachers) {
    const email = teacher.email.toLowerCase();
    if (!email) {
      continue;
    }

    byEmail.set(email, [...(byEmail.get(email) ?? []), teacher]);
  }

  return Array.from(byEmail.entries())
    .filter(([, entries]) => entries.length > 1)
    .map(([email, entries]) => ({
      email,
      teachers: entries.map((entry) => ({ itemId: entry.itemId, name: entry.name })),
    }));
}
