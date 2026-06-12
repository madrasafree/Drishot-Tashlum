// Portal meeting services. Server-side only.
//
// Meetings are REAL Monday items on a dedicated Meetings board — the portal
// never generates virtual meetings from course schedules. Until the board ID
// (PORTAL_MEETINGS_BOARD_ID env) and the required columns are mapped in
// lib/monday/portal-mappings.ts, every real (non-preview) code path throws
// PortalConfigurationError with the missing mapping keys.

import { unstable_cache } from "next/cache";

import { fetchQuery } from "@/lib/monday/client";
import { isMondayPreviewMode } from "@/lib/monday/mock";
import { getMeetingsBoardId, MEETING_COLUMNS } from "@/lib/monday/portal-mappings";
import {
  getMockMeetingById,
  getMockMeetingsForCourse,
  getMockMeetingsForTeacher,
  getMockMeetingStudents,
} from "@/lib/monday/portal-mock";
import {
  PortalConfigurationError,
  type MeetingStatus,
  type MeetingStudent,
  type PortalMeeting,
} from "@/lib/monday/portal-types";
import { getTodayInIsrael } from "@/lib/utils";

type ColumnValueResponse = {
  id: string;
  text: string | null;
  value: unknown;
  label?: string | null;
  date?: string | null;
  number?: number | null;
  display_value?: string | null;
  linked_item_ids?: string[];
  linked_items?: Array<{
    id: string;
    name: string;
  }>;
};

type MeetingItemResponse = {
  id: string;
  name: string;
  column_values: ColumnValueResponse[];
};

type BoardsItemsResponse = {
  boards: Array<{
    items_page: {
      items: MeetingItemResponse[];
    };
  }>;
};

type ItemsResponse = {
  items: MeetingItemResponse[];
};

const COLUMN_VALUE_FIELDS = `
  id
  text
  value
  ... on BoardRelationValue {
    linked_item_ids
    display_value
    linked_items {
      id
      name
    }
  }
  ... on StatusValue {
    label
  }
  ... on DateValue {
    date
  }
  ... on NumbersValue {
    number
  }
  ... on LinkValue {
    url
  }
`;

const MEETINGS_PAGE_LIMIT = 500;

interface MeetingsConfig {
  boardId: number;
  courseRelationColumnId: string;
  teacherRelationColumnId: string;
  dateColumnId: string;
  statusColumnId: string;
}

/**
 * Throws PortalConfigurationError listing every missing required mapping for
 * the Meetings board; returns the resolved config when fully mapped.
 */
export function assertMeetingsConfigured(): MeetingsConfig {
  const boardId = getMeetingsBoardId();
  const courseRelationColumnId = MEETING_COLUMNS.COURSE_RELATION;
  const teacherRelationColumnId = MEETING_COLUMNS.TEACHER_RELATION;
  const dateColumnId = MEETING_COLUMNS.DATE;
  const statusColumnId = MEETING_COLUMNS.STATUS;

  const missing: string[] = [];

  if (boardId === null) {
    missing.push("PORTAL_MEETINGS_BOARD_ID");
  }
  if (!courseRelationColumnId) {
    missing.push("MEETINGS.COURSE_RELATION");
  }
  if (!teacherRelationColumnId) {
    missing.push("MEETINGS.TEACHER_RELATION");
  }
  if (!dateColumnId) {
    missing.push("MEETINGS.DATE");
  }
  if (!statusColumnId) {
    missing.push("MEETINGS.STATUS");
  }

  if (
    boardId === null ||
    !courseRelationColumnId ||
    !teacherRelationColumnId ||
    !dateColumnId ||
    !statusColumnId
  ) {
    throw new PortalConfigurationError(
      `לוח המפגשים אינו מוגדר עדיין במאנדיי ולכן לא ניתן לטעון מפגשים. המיפויים החסרים: ${missing.join(", ")}`,
      missing,
    );
  }

  return {
    boardId,
    courseRelationColumnId,
    teacherRelationColumnId,
    dateColumnId,
    statusColumnId,
  };
}

/** Non-throwing check, e.g. for optional consumers like the private notebook. */
export function isMeetingsConfigured(): boolean {
  try {
    assertMeetingsConfigured();
    return true;
  } catch {
    return false;
  }
}

const MEETING_STATUS_BY_LABEL: Record<string, MeetingStatus> = {
  התקיים: "completed",
  הסתיים: "completed",
  בוצע: "completed",
  completed: "completed",
  בוטל: "cancelled",
  cancelled: "cancelled",
  מתוכנן: "scheduled",
  עתידי: "scheduled",
  scheduled: "scheduled",
};

function normalizeMeetingStatus(label: string): MeetingStatus {
  const trimmed = label.trim();

  if (!trimmed) {
    return "unknown";
  }

  return (
    MEETING_STATUS_BY_LABEL[trimmed] ?? MEETING_STATUS_BY_LABEL[trimmed.toLowerCase()] ?? "unknown"
  );
}

function getColumn(item: MeetingItemResponse, columnId: string | null) {
  if (!columnId) {
    return undefined;
  }

  return item.column_values.find((column) => column.id === columnId);
}

function parseLinkedIds(value: ColumnValueResponse | undefined) {
  return (value?.linked_item_ids || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id));
}

function parseNumber(value: ColumnValueResponse | undefined) {
  if (typeof value?.number === "number") {
    return value.number;
  }

  const rawValue = value?.display_value || value?.text;
  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue.toString().replace(/[^\d.-]/g, ""));
  return Number.isNaN(parsed) ? null : parsed;
}

/** Extracts "HH:mm" from a Monday DateValue raw value JSON when a time is set. */
function parseStartTime(rawValue: unknown): string | null {
  if (typeof rawValue !== "string" || !rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as { time?: string | null };

    if (typeof parsed?.time === "string" && parsed.time) {
      return parsed.time.slice(0, 5);
    }
  } catch {
    // Tolerate values that are not valid JSON.
  }

  return null;
}

function parseLinkUrl(column: ColumnValueResponse | undefined): string | null {
  if (!column) {
    return null;
  }

  if (typeof column.value === "string" && column.value) {
    try {
      const parsed = JSON.parse(column.value) as { url?: string | null };

      if (typeof parsed?.url === "string" && parsed.url) {
        return parsed.url;
      }
    } catch {
      // Fall back to text below.
    }
  }

  return column.text?.trim() || null;
}

function parsePortalMeeting(item: MeetingItemResponse): PortalMeeting {
  const courseRelation = getColumn(item, MEETING_COLUMNS.COURSE_RELATION);
  const teacherRelation = getColumn(item, MEETING_COLUMNS.TEACHER_RELATION);
  const dateColumn = getColumn(item, MEETING_COLUMNS.DATE);
  const statusColumn = getColumn(item, MEETING_COLUMNS.STATUS);
  const attendanceColumn = getColumn(item, MEETING_COLUMNS.ATTENDANCE);
  const statusLabel = statusColumn?.label || statusColumn?.text || "";

  return {
    itemId: Number(item.id),
    name: item.name,
    courseItemId: parseLinkedIds(courseRelation)[0] ?? null,
    courseName: courseRelation?.linked_items?.[0]?.name || null,
    teacherItemIds: parseLinkedIds(teacherRelation),
    date: dateColumn?.date || null,
    startTime: parseStartTime(dateColumn?.value),
    durationMinutes: MEETING_COLUMNS.DURATION_MINUTES
      ? parseNumber(getColumn(item, MEETING_COLUMNS.DURATION_MINUTES))
      : null,
    status: normalizeMeetingStatus(statusLabel),
    statusLabel,
    location: MEETING_COLUMNS.LOCATION
      ? getColumn(item, MEETING_COLUMNS.LOCATION)?.text?.trim() || null
      : null,
    zoomLink: MEETING_COLUMNS.ZOOM_LINK
      ? parseLinkUrl(getColumn(item, MEETING_COLUMNS.ZOOM_LINK))
      : null,
    attendanceSubmitted: Boolean(MEETING_COLUMNS.ATTENDANCE && attendanceColumn?.text?.trim()),
  };
}

function getMappedMeetingColumnIds(): string[] {
  return Object.values(MEETING_COLUMNS).filter((columnId): columnId is string =>
    Boolean(columnId),
  );
}

const getMeetingsByRelationCached = unstable_cache(
  async (relation: "teacher" | "course", relatedItemId: number): Promise<PortalMeeting[]> => {
    const config = assertMeetingsConfigured();
    const relationColumnId =
      relation === "teacher" ? config.teacherRelationColumnId : config.courseRelationColumnId;

    const query = `
      query GetPortalMeetingsByRelation($columnIds: [String!]) {
        boards(ids: [${config.boardId}]) {
          items_page(
            limit: ${MEETINGS_PAGE_LIMIT}
            query_params: {
              rules: [
                {
                  column_id: "${relationColumnId}"
                  compare_value: [${relatedItemId}]
                  operator: any_of
                }
              ]
            }
          ) {
            items {
              id
              name
              column_values(ids: $columnIds) {
                ${COLUMN_VALUE_FIELDS}
              }
            }
          }
        }
      }
    `;

    const response = await fetchQuery<BoardsItemsResponse>(query, {
      columnIds: getMappedMeetingColumnIds(),
    });

    return (response.boards[0]?.items_page.items || []).map(parsePortalMeeting);
  },
  ["portal-meetings-by-relation"],
  { revalidate: 30 },
);

export async function getMeetingsForTeacher(teacherItemId: number): Promise<PortalMeeting[]> {
  if (isMondayPreviewMode()) {
    return getMockMeetingsForTeacher(teacherItemId);
  }

  assertMeetingsConfigured();
  return getMeetingsByRelationCached("teacher", teacherItemId);
}

export async function getMeetingsForCourse(courseItemId: number): Promise<PortalMeeting[]> {
  if (isMondayPreviewMode()) {
    return getMockMeetingsForCourse(courseItemId);
  }

  assertMeetingsConfigured();
  return getMeetingsByRelationCached("course", courseItemId);
}

export async function getMeetingById(meetingItemId: number): Promise<PortalMeeting | null> {
  if (isMondayPreviewMode()) {
    return getMockMeetingById(meetingItemId);
  }

  assertMeetingsConfigured();

  const query = `
    query GetPortalMeetingById($ids: [ID!]!, $columnIds: [String!]) {
      items(ids: $ids) {
        id
        name
        column_values(ids: $columnIds) {
          ${COLUMN_VALUE_FIELDS}
        }
      }
    }
  `;

  const response = await fetchQuery<ItemsResponse>(query, {
    ids: [meetingItemId],
    columnIds: getMappedMeetingColumnIds(),
  });

  const item = response.items[0];
  return item ? parsePortalMeeting(item) : null;
}

export async function getUpcomingMeetingsForTeacher(
  teacherItemId: number,
  limit = 10,
): Promise<PortalMeeting[]> {
  const meetings = await getMeetingsForTeacher(teacherItemId);
  const today = getTodayInIsrael();

  return meetings
    .filter((meeting) => meeting.date !== null && meeting.date >= today)
    .sort(
      (left, right) =>
        (left.date ?? "").localeCompare(right.date ?? "") ||
        (left.startTime ?? "").localeCompare(right.startTime ?? ""),
    )
    .slice(0, limit);
}

export async function getMeetingStudents(meetingItemId: number): Promise<MeetingStudent[]> {
  if (isMondayPreviewMode()) {
    return getMockMeetingStudents(meetingItemId);
  }

  assertMeetingsConfigured();

  const studentsColumnId = MEETING_COLUMNS.STUDENTS;

  if (!studentsColumnId) {
    throw new PortalConfigurationError(
      "עמודת התלמידים בלוח המפגשים אינה ממופה עדיין ולכן לא ניתן לטעון את רשימת התלמידים. המיפוי החסר: MEETINGS.STUDENTS",
      ["MEETINGS.STUDENTS"],
    );
  }

  const query = `
    query GetPortalMeetingStudents($ids: [ID!]!, $columnIds: [String!]) {
      items(ids: $ids) {
        id
        name
        column_values(ids: $columnIds) {
          ${COLUMN_VALUE_FIELDS}
        }
      }
    }
  `;

  const response = await fetchQuery<ItemsResponse>(query, {
    ids: [meetingItemId],
    columnIds: [studentsColumnId],
  });

  const item = response.items[0];
  const studentsColumn = item ? getColumn(item, studentsColumnId) : undefined;

  if (studentsColumn?.linked_items?.length) {
    return studentsColumn.linked_items.map((linked) => ({
      id: linked.id,
      name: linked.name,
    }));
  }

  // Fallback for text-like columns: one student name per line.
  const text = studentsColumn?.text?.trim();
  if (!text) {
    return [];
  }

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((name, index) => ({
      id: `s-${meetingItemId}-${index + 1}`,
      name,
    }));
}
