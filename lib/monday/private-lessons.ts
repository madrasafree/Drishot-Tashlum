// Portal private-lesson notebook services. Server-side only.
//
// This module powers the "student notebook" for private-lesson products:
// course-level fields live on the Private Lessons board and per-meeting
// summaries live on the Meetings board. It is separate from (and does not
// touch) the existing private-lesson payment queries in lib/monday/queries.ts.
//
// Notebook columns are not mapped in Monday yet (typed null placeholders in
// lib/monday/portal-mappings.ts): reads degrade to empty strings with
// storedInMonday=false, and real (non-preview) writes throw
// PortalConfigurationError listing the missing mapping keys.

import { fetchQuery, fetchMutation } from "@/lib/monday/client";
import { BOARD_IDS, PRIVATE_LESSON_COLUMNS } from "@/lib/monday/constants";
import { getMeetingsForCourse, isMeetingsConfigured } from "@/lib/monday/meetings";
import { isMondayPreviewMode } from "@/lib/monday/mock";
import {
  getMeetingsBoardId,
  PRIVATE_NOTEBOOK_COURSE_COLUMNS,
  PRIVATE_NOTEBOOK_MEETING_COLUMNS,
} from "@/lib/monday/portal-mappings";
import { getMockPortalCourseById, getMockPrivateNotebook } from "@/lib/monday/portal-mock";
import {
  PortalConfigurationError,
  type NotebookCourseUpdate,
  type NotebookMeetingUpdate,
  type PrivateCourseNotebook,
  type PrivateNotebookMeetingSummary,
} from "@/lib/monday/portal-types";

type ColumnValueResponse = {
  id: string;
  text: string | null;
  value: unknown;
  label?: string | null;
  display_value?: string | null;
  linked_item_ids?: string[];
  linked_items?: Array<{
    id: string;
    name: string;
  }>;
};

type NotebookItemResponse = {
  id: string;
  name: string;
  board?: {
    id: string;
  } | null;
  column_values: ColumnValueResponse[];
};

type ItemsResponse = {
  items: NotebookItemResponse[];
};

type ChangeColumnValuesResponse = {
  change_multiple_column_values: {
    id: string;
  };
};

interface NotebookUpdateResult {
  ok: boolean;
  storedInMonday: boolean;
  message: string;
}

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
`;

function getColumn(item: NotebookItemResponse | undefined, columnId: string | null) {
  if (!item || !columnId) {
    return undefined;
  }

  return item.column_values.find((column) => column.id === columnId);
}

/** Reads a mapped column's text; returns "" when the mapping is missing. */
function readMappedText(item: NotebookItemResponse | undefined, columnId: string | null): string {
  return getColumn(item, columnId)?.text?.trim() || "";
}

async function getItemsByIds(ids: number[], columnIds: string[]): Promise<NotebookItemResponse[]> {
  if (!ids.length) {
    return [];
  }

  const query = `
    query GetNotebookItemsByIds($ids: [ID!]!, $columnIds: [String!]) {
      items(ids: $ids) {
        id
        name
        board {
          id
        }
        column_values(ids: $columnIds) {
          ${COLUMN_VALUE_FIELDS}
        }
      }
    }
  `;

  const response = await fetchQuery<ItemsResponse>(query, {
    ids,
    columnIds,
  });

  return response.items;
}

async function changeMultipleColumnValues(
  boardId: number,
  itemId: number,
  columnValues: Record<string, unknown>,
) {
  const mutation = `
    mutation UpdatePortalNotebookColumns($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
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
    itemId,
    columnValues: JSON.stringify(columnValues),
  });
}

async function getMeetingSummariesForCourse(
  courseItemId: number,
): Promise<PrivateNotebookMeetingSummary[]> {
  const mappedMeetingColumnIds = Object.values(PRIVATE_NOTEBOOK_MEETING_COLUMNS).filter(
    (columnId): columnId is string => Boolean(columnId),
  );

  if (!isMeetingsConfigured() || !mappedMeetingColumnIds.length) {
    return [];
  }

  const meetings = await getMeetingsForCourse(courseItemId);

  if (!meetings.length) {
    return [];
  }

  const items = await getItemsByIds(
    meetings.map((meeting) => meeting.itemId),
    mappedMeetingColumnIds,
  );
  const itemsById = new Map(items.map((item) => [Number(item.id), item]));

  return meetings.map((meeting) => {
    const item = itemsById.get(meeting.itemId);

    return {
      meetingItemId: meeting.itemId,
      date: meeting.date,
      topicsCovered: readMappedText(item, PRIVATE_NOTEBOOK_MEETING_COLUMNS.TOPICS_COVERED),
      newWordsPhrases: readMappedText(item, PRIVATE_NOTEBOOK_MEETING_COLUMNS.NEW_WORDS_PHRASES),
      homework: readMappedText(item, PRIVATE_NOTEBOOK_MEETING_COLUMNS.HOMEWORK),
      teacherNotes: readMappedText(item, PRIVATE_NOTEBOOK_MEETING_COLUMNS.TEACHER_NOTES),
    };
  });
}

export async function getPrivateCourseNotebook(
  courseItemId: number,
): Promise<PrivateCourseNotebook | null> {
  if (isMondayPreviewMode()) {
    return getMockPrivateNotebook(courseItemId);
  }

  const mappedCourseColumnIds = Object.values(PRIVATE_NOTEBOOK_COURSE_COLUMNS).filter(
    (columnId): columnId is string => Boolean(columnId),
  );

  const items = await getItemsByIds(
    [courseItemId],
    [
      PRIVATE_LESSON_COLUMNS.STUDENT_NAME,
      PRIVATE_LESSON_COLUMNS.TEACHER_RELATION,
      ...mappedCourseColumnIds,
    ],
  );

  const item = items[0];

  if (!item || Number(item.board?.id) !== BOARD_IDS.PRIVATE_LESSONS) {
    return null;
  }

  const teacherRelation = getColumn(item, PRIVATE_LESSON_COLUMNS.TEACHER_RELATION);
  const allCourseColumnsMapped = Object.values(PRIVATE_NOTEBOOK_COURSE_COLUMNS).every(Boolean);

  return {
    courseItemId,
    studentName: getColumn(item, PRIVATE_LESSON_COLUMNS.STUDENT_NAME)?.text?.trim() || item.name,
    teacherName: teacherRelation?.linked_items?.[0]?.name || teacherRelation?.display_value || "",
    learningGoals: readMappedText(item, PRIVATE_NOTEBOOK_COURSE_COLUMNS.LEARNING_GOALS),
    languageBackground: readMappedText(item, PRIVATE_NOTEBOOK_COURSE_COLUMNS.LANGUAGE_BACKGROUND),
    generalNotes: readMappedText(item, PRIVATE_NOTEBOOK_COURSE_COLUMNS.GENERAL_NOTES),
    meetingSummaries: await getMeetingSummariesForCourse(courseItemId),
    storedInMonday: allCourseColumnsMapped,
  };
}

interface NotebookFieldUpdate {
  mappingKey: string;
  columnId: string | null;
  value: string | undefined;
}

function buildNotebookColumnValues(
  fields: NotebookFieldUpdate[],
  errorMessagePrefix: string,
  extraMissing: string[] = [],
): Record<string, unknown> | null {
  const provided = fields.filter((field) => field.value !== undefined);

  if (!provided.length && !extraMissing.length) {
    return null;
  }

  const missing = [
    ...extraMissing,
    ...provided.filter((field) => !field.columnId).map((field) => field.mappingKey),
  ];

  if (missing.length) {
    throw new PortalConfigurationError(`${errorMessagePrefix}: ${missing.join(", ")}`, missing);
  }

  if (!provided.length) {
    return null;
  }

  // Notebook columns are assumed to be long_text columns ({ text }) until the
  // real Monday columns are created and mapped.
  const columnValues: Record<string, unknown> = {};

  for (const field of provided) {
    if (field.columnId) {
      columnValues[field.columnId] = { text: field.value ?? "" };
    }
  }

  return columnValues;
}

export async function updatePrivateCourseNotebook(
  courseItemId: number,
  update: NotebookCourseUpdate,
): Promise<NotebookUpdateResult> {
  if (isMondayPreviewMode()) {
    return {
      ok: true,
      storedInMonday: false,
      message: "נשמר במצב תצוגה מקדימה בלבד",
    };
  }

  const columnValues = buildNotebookColumnValues(
    [
      {
        mappingKey: "NOTEBOOK_COURSE.LEARNING_GOALS",
        columnId: PRIVATE_NOTEBOOK_COURSE_COLUMNS.LEARNING_GOALS,
        value: update.learningGoals,
      },
      {
        mappingKey: "NOTEBOOK_COURSE.LANGUAGE_BACKGROUND",
        columnId: PRIVATE_NOTEBOOK_COURSE_COLUMNS.LANGUAGE_BACKGROUND,
        value: update.languageBackground,
      },
      {
        mappingKey: "NOTEBOOK_COURSE.GENERAL_NOTES",
        columnId: PRIVATE_NOTEBOOK_COURSE_COLUMNS.GENERAL_NOTES,
        value: update.generalNotes,
      },
    ],
    "לא ניתן לשמור את מחברת התלמיד במאנדיי כי המיפויים הבאים עדיין חסרים",
  );

  if (!columnValues) {
    return {
      ok: true,
      storedInMonday: false,
      message: "לא נשלחו שדות לעדכון",
    };
  }

  await changeMultipleColumnValues(BOARD_IDS.PRIVATE_LESSONS, courseItemId, columnValues);

  return {
    ok: true,
    storedInMonday: true,
    message: "מחברת התלמיד נשמרה במאנדיי",
  };
}

export async function updateMeetingNotebook(
  meetingItemId: number,
  update: NotebookMeetingUpdate,
): Promise<NotebookUpdateResult> {
  if (isMondayPreviewMode()) {
    return {
      ok: true,
      storedInMonday: false,
      message: "נשמר במצב תצוגה מקדימה בלבד",
    };
  }

  const meetingsBoardId = getMeetingsBoardId();

  const columnValues = buildNotebookColumnValues(
    [
      {
        mappingKey: "NOTEBOOK_MEETING.TOPICS_COVERED",
        columnId: PRIVATE_NOTEBOOK_MEETING_COLUMNS.TOPICS_COVERED,
        value: update.topicsCovered,
      },
      {
        mappingKey: "NOTEBOOK_MEETING.NEW_WORDS_PHRASES",
        columnId: PRIVATE_NOTEBOOK_MEETING_COLUMNS.NEW_WORDS_PHRASES,
        value: update.newWordsPhrases,
      },
      {
        mappingKey: "NOTEBOOK_MEETING.HOMEWORK",
        columnId: PRIVATE_NOTEBOOK_MEETING_COLUMNS.HOMEWORK,
        value: update.homework,
      },
      {
        mappingKey: "NOTEBOOK_MEETING.TEACHER_NOTES",
        columnId: PRIVATE_NOTEBOOK_MEETING_COLUMNS.TEACHER_NOTES,
        value: update.teacherNotes,
      },
    ],
    "לא ניתן לשמור את סיכום המפגש במאנדיי כי המיפויים הבאים עדיין חסרים",
    meetingsBoardId === null ? ["PORTAL_MEETINGS_BOARD_ID"] : [],
  );

  if (!columnValues || meetingsBoardId === null) {
    return {
      ok: true,
      storedInMonday: false,
      message: "לא נשלחו שדות לעדכון",
    };
  }

  await changeMultipleColumnValues(meetingsBoardId, meetingItemId, columnValues);

  return {
    ok: true,
    storedInMonday: true,
    message: "סיכום המפגש נשמר במאנדיי",
  };
}

export async function getPrivateLessonOwnerTeacherIds(courseItemId: number): Promise<number[]> {
  if (isMondayPreviewMode()) {
    return getMockPortalCourseById(courseItemId)?.teacherItemIds ?? [];
  }

  const items = await getItemsByIds([courseItemId], [PRIVATE_LESSON_COLUMNS.TEACHER_RELATION]);
  const item = items[0];

  if (!item || Number(item.board?.id) !== BOARD_IDS.PRIVATE_LESSONS) {
    return [];
  }

  return (getColumn(item, PRIVATE_LESSON_COLUMNS.TEACHER_RELATION)?.linked_item_ids || [])
    .map((id) => Number(id))
    .filter((id) => !Number.isNaN(id));
}
