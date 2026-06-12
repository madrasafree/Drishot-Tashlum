// Portal attendance services. Server-side only.
//
// AUTHORIZATION: this module performs NO authorization checks. Callers
// (server actions / route handlers) must verify that the authenticated user
// is allowed to read or submit attendance for the meeting BEFORE calling
// these functions, and must set submittedByTeacherItemId server-side from the
// authenticated session (never trusted from the client).

import { fetchQuery, fetchMutation } from "@/lib/monday/client";
import { isMondayPreviewMode } from "@/lib/monday/mock";
import { getMeetingsBoardId, MEETING_COLUMNS } from "@/lib/monday/portal-mappings";
import { getMockAttendanceForMeeting } from "@/lib/monday/portal-mock";
import {
  PortalConfigurationError,
  type AttendanceEntry,
  type AttendancePayload,
  type AttendanceSubmitResult,
} from "@/lib/monday/portal-types";

type AttendanceColumnResponse = {
  items: Array<{
    id: string;
    column_values: Array<{
      id: string;
      text: string | null;
    }>;
  }>;
};

type ChangeColumnValuesResponse = {
  change_multiple_column_values: {
    id: string;
  };
};

/** Shape of the JSON snapshot stored in the ATTENDANCE column. */
interface AttendanceSnapshot {
  submittedByTeacherItemId: number;
  submittedAt: string;
  entries: AttendanceEntry[];
  generalNote: string;
}

export async function submitAttendance(
  payload: AttendancePayload,
): Promise<AttendanceSubmitResult> {
  if (isMondayPreviewMode()) {
    return {
      ok: true,
      storedInMonday: false,
      message: "נשמר במצב תצוגה מקדימה בלבד",
    };
  }

  const boardId = getMeetingsBoardId();
  const attendanceColumnId = MEETING_COLUMNS.ATTENDANCE;
  const missing: string[] = [];

  if (boardId === null) {
    missing.push("PORTAL_MEETINGS_BOARD_ID");
  }
  if (!attendanceColumnId) {
    missing.push("MEETINGS.ATTENDANCE");
  }

  if (boardId === null || !attendanceColumnId) {
    throw new PortalConfigurationError(
      `לא ניתן לשמור נוכחות במאנדיי כי המיפויים הבאים עדיין חסרים: ${missing.join(", ")}`,
      missing,
    );
  }

  // NOTE: the attendance storage model in Monday (long_text JSON snapshot vs
  // subitems vs a connected attendance board) is a pending product decision.
  // Until it is made, the guarded default is a JSON snapshot written into the
  // ATTENDANCE column, assumed to be a long_text column.
  const snapshot: AttendanceSnapshot = {
    submittedByTeacherItemId: payload.submittedByTeacherItemId,
    submittedAt: new Date().toISOString(),
    entries: payload.entries,
    generalNote: payload.generalNote ?? "",
  };

  const columnValues: Record<string, unknown> = {
    [attendanceColumnId]: { text: JSON.stringify(snapshot) },
  };

  if (MEETING_COLUMNS.ATTENDANCE_NOTE) {
    columnValues[MEETING_COLUMNS.ATTENDANCE_NOTE] = { text: payload.generalNote ?? "" };
  }

  const mutation = `
    mutation SubmitMeetingAttendance($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(
        board_id: $boardId,
        item_id: $itemId,
        column_values: $columnValues
      ) {
        id
      }
    }
  `;

  await fetchMutation<ChangeColumnValuesResponse>(mutation, {
    boardId,
    itemId: payload.meetingItemId,
    columnValues: JSON.stringify(columnValues),
  });

  return {
    ok: true,
    storedInMonday: true,
    message: "הנוכחות נשמרה במאנדיי",
  };
}

export async function getAttendanceForMeeting(
  meetingItemId: number,
): Promise<AttendanceEntry[] | null> {
  if (isMondayPreviewMode()) {
    return getMockAttendanceForMeeting(meetingItemId);
  }

  const attendanceColumnId = MEETING_COLUMNS.ATTENDANCE;

  if (!attendanceColumnId) {
    return null;
  }

  const query = `
    query GetMeetingAttendance($ids: [ID!]!, $columnIds: [String!]) {
      items(ids: $ids) {
        id
        column_values(ids: $columnIds) {
          id
          text
        }
      }
    }
  `;

  const response = await fetchQuery<AttendanceColumnResponse>(query, {
    ids: [meetingItemId],
    columnIds: [attendanceColumnId],
  });

  const text = response.items[0]?.column_values
    .find((column) => column.id === attendanceColumnId)
    ?.text?.trim();

  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as Partial<AttendanceSnapshot> | null;

    if (!parsed || !Array.isArray(parsed.entries)) {
      return null;
    }

    return parsed.entries;
  } catch {
    // Tolerate legacy/free-text content in the attendance column.
    return null;
  }
}
