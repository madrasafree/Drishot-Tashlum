// Portal course services. Server-side only.
// Normalizes Courses board items and Private Lessons board items into
// PortalCourse for the teacher portal UI.
//
// PortalCourse intentionally NEVER includes teaching/travel rates — the
// portal must not expose payment rates. location/zoomLink stay null for
// regular courses because no Monday column is mapped for them yet (we never
// invent column IDs).

import { unstable_cache } from "next/cache";

import { fetchQuery } from "@/lib/monday/client";
import {
  BOARD_IDS,
  COURSE_COLUMNS,
  PRIVATE_LESSON_COLUMNS,
} from "@/lib/monday/constants";
import { isMondayPreviewMode } from "@/lib/monday/mock";
import {
  getMockPortalCourseById,
  getMockPortalCourses,
  getMockPortalCoursesForTeacher,
} from "@/lib/monday/portal-mock";
import type { PortalCourse } from "@/lib/monday/portal-types";

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

type CourseItemResponse = {
  id: string;
  name: string;
  board?: {
    id: string;
  } | null;
  column_values: ColumnValueResponse[];
};

type BoardsItemsResponse = {
  boards: Array<{
    items_page: {
      cursor?: string | null;
      items: CourseItemResponse[];
    };
  }>;
};

type NextItemsPageResponse = {
  next_items_page: {
    cursor?: string | null;
    items: CourseItemResponse[];
  };
};

type ItemsResponse = {
  items: CourseItemResponse[];
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
`;

const COURSE_COLUMN_IDS = [
  COURSE_COLUMNS.TEACHER_RELATION,
  COURSE_COLUMNS.START_DATE,
  COURSE_COLUMNS.END_DATE,
  COURSE_COLUMNS.COURSE_STATE,
  COURSE_COLUMNS.LESSONS_COUNT,
];

const PRIVATE_LESSON_COLUMN_IDS = [
  PRIVATE_LESSON_COLUMNS.TEACHER_RELATION,
  PRIVATE_LESSON_COLUMNS.STUDENT_NAME,
  PRIVATE_LESSON_COLUMNS.STATUS,
  PRIVATE_LESSON_COLUMNS.LESSONS_PURCHASED,
];

const COURSES_PAGE_LIMIT = 500;
const COURSES_MAX_PAGES = 4;

function getColumn(item: CourseItemResponse, columnId: string) {
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

function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values));
}

function parseCourseItem(item: CourseItemResponse, extraTeacherIds: number[] = []): PortalCourse {
  const teacherRelation = getColumn(item, COURSE_COLUMNS.TEACHER_RELATION);
  const stateColumn = getColumn(item, COURSE_COLUMNS.COURSE_STATE);

  return {
    itemId: Number(item.id),
    name: item.name,
    kind: "course",
    state: stateColumn?.label || stateColumn?.text || "",
    startDate: getColumn(item, COURSE_COLUMNS.START_DATE)?.date || null,
    endDate: getColumn(item, COURSE_COLUMNS.END_DATE)?.date || null,
    lessonsCount: parseNumber(getColumn(item, COURSE_COLUMNS.LESSONS_COUNT)),
    teacherItemIds: uniqueNumbers([...extraTeacherIds, ...parseLinkedIds(teacherRelation)]),
    // teacherNames may be empty in real mode (relation names not always returned).
    teacherNames: (teacherRelation?.linked_items || []).map((linked) => linked.name),
    // No location/zoom columns are mapped on the Courses board yet — never invent IDs.
    location: null,
    zoomLink: null,
    studentName: null,
  };
}

function parsePrivateLessonItem(
  item: CourseItemResponse,
  extraTeacherIds: number[] = [],
): PortalCourse {
  const teacherRelation = getColumn(item, PRIVATE_LESSON_COLUMNS.TEACHER_RELATION);
  const statusColumn = getColumn(item, PRIVATE_LESSON_COLUMNS.STATUS);

  return {
    itemId: Number(item.id),
    name: item.name,
    kind: "private_lessons",
    state: statusColumn?.label || statusColumn?.text || "",
    startDate: null,
    endDate: null,
    lessonsCount: parseNumber(getColumn(item, PRIVATE_LESSON_COLUMNS.LESSONS_PURCHASED)),
    teacherItemIds: uniqueNumbers([...extraTeacherIds, ...parseLinkedIds(teacherRelation)]),
    teacherNames: (teacherRelation?.linked_items || []).map((linked) => linked.name),
    location: null,
    zoomLink: null,
    studentName: getColumn(item, PRIVATE_LESSON_COLUMNS.STUDENT_NAME)?.text || item.name,
  };
}

function getPortalCourseDateTimestamp(course: PortalCourse) {
  const timestamps = [course.startDate, course.endDate]
    .map((date) => (date ? Date.parse(date) : Number.NaN))
    .filter((timestamp) => !Number.isNaN(timestamp));

  if (!timestamps.length) {
    return null;
  }

  return Math.max(...timestamps);
}

function comparePortalCoursesByDateDesc(left: PortalCourse, right: PortalCourse) {
  const leftTimestamp = getPortalCourseDateTimestamp(left);
  const rightTimestamp = getPortalCourseDateTimestamp(right);

  if (leftTimestamp === null && rightTimestamp === null) {
    return left.name.localeCompare(right.name, "he");
  }

  if (leftTimestamp === null) {
    return 1;
  }

  if (rightTimestamp === null) {
    return -1;
  }

  return rightTimestamp - leftTimestamp || left.name.localeCompare(right.name, "he");
}

async function fetchCoursesLinkedToTeacher(teacherItemId: number): Promise<PortalCourse[]> {
  const query = `
    query GetPortalCoursesForTeacher($columnIds: [String!]) {
      boards(ids: [${BOARD_IDS.COURSES}]) {
        items_page(
          limit: ${COURSES_PAGE_LIMIT}
          query_params: {
            rules: [
              {
                column_id: "${COURSE_COLUMNS.TEACHER_RELATION}"
                compare_value: [${teacherItemId}]
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
    columnIds: COURSE_COLUMN_IDS,
  });

  return (response.boards[0]?.items_page.items || []).map((item) =>
    parseCourseItem(item, [teacherItemId]),
  );
}

async function fetchPrivateLessonsLinkedToTeacher(teacherItemId: number): Promise<PortalCourse[]> {
  const query = `
    query GetPortalPrivateLessonsForTeacher($columnIds: [String!]) {
      boards(ids: [${BOARD_IDS.PRIVATE_LESSONS}]) {
        items_page(
          limit: ${COURSES_PAGE_LIMIT}
          query_params: {
            rules: [
              {
                column_id: "${PRIVATE_LESSON_COLUMNS.TEACHER_RELATION}"
                compare_value: [${teacherItemId}]
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
    columnIds: PRIVATE_LESSON_COLUMN_IDS,
  });

  return (response.boards[0]?.items_page.items || []).map((item) =>
    parsePrivateLessonItem(item, [teacherItemId]),
  );
}

const getPortalCoursesForTeacherCached = unstable_cache(
  async (teacherItemId: number): Promise<PortalCourse[]> => {
    const [courses, privateLessons] = await Promise.all([
      fetchCoursesLinkedToTeacher(teacherItemId),
      fetchPrivateLessonsLinkedToTeacher(teacherItemId),
    ]);

    return [...courses, ...privateLessons].sort(comparePortalCoursesByDateDesc);
  },
  ["portal-courses-for-teacher"],
  { revalidate: 30 },
);

export async function getPortalCoursesForTeacher(teacherItemId: number): Promise<PortalCourse[]> {
  if (isMondayPreviewMode()) {
    return getMockPortalCoursesForTeacher(teacherItemId);
  }

  return getPortalCoursesForTeacherCached(teacherItemId);
}

export async function getPortalCourseById(courseItemId: number): Promise<PortalCourse | null> {
  if (isMondayPreviewMode()) {
    return getMockPortalCourseById(courseItemId);
  }

  const query = `
    query GetPortalCourseById($ids: [ID!]!, $columnIds: [String!]) {
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
    ids: [courseItemId],
    columnIds: [...COURSE_COLUMN_IDS, ...PRIVATE_LESSON_COLUMN_IDS],
  });

  const item = response.items[0];
  if (!item?.board) {
    return null;
  }

  const boardId = Number(item.board.id);

  if (boardId === BOARD_IDS.COURSES) {
    return parseCourseItem(item);
  }

  if (boardId === BOARD_IDS.PRIVATE_LESSONS) {
    return parsePrivateLessonItem(item);
  }

  // Item belongs to a different board — not a portal course.
  return null;
}

export async function getPortalCoursesForTeachers(
  teacherItemIds: number[],
): Promise<PortalCourse[]> {
  const uniqueTeacherIds = uniqueNumbers(teacherItemIds);
  const courseLists = await Promise.all(
    uniqueTeacherIds.map((teacherItemId) => getPortalCoursesForTeacher(teacherItemId)),
  );

  const coursesByItemId = new Map<number, PortalCourse>();

  for (const course of courseLists.flat()) {
    const existing = coursesByItemId.get(course.itemId);

    if (existing) {
      coursesByItemId.set(course.itemId, {
        ...existing,
        teacherItemIds: uniqueNumbers([...existing.teacherItemIds, ...course.teacherItemIds]),
        teacherNames: Array.from(new Set([...existing.teacherNames, ...course.teacherNames])),
      });
    } else {
      coursesByItemId.set(course.itemId, course);
    }
  }

  return Array.from(coursesByItemId.values()).sort(comparePortalCoursesByDateDesc);
}

async function getAllPortalCourseItems(): Promise<CourseItemResponse[]> {
  const firstPageQuery = `
    query GetAllPortalCoursesFirstPage($columnIds: [String!]) {
      boards(ids: [${BOARD_IDS.COURSES}]) {
        items_page(limit: ${COURSES_PAGE_LIMIT}) {
          cursor
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

  const firstPage = await fetchQuery<BoardsItemsResponse>(firstPageQuery, {
    columnIds: COURSE_COLUMN_IDS,
  });

  const firstItemsPage = firstPage.boards[0]?.items_page;
  const items = [...(firstItemsPage?.items || [])];
  let cursor = firstItemsPage?.cursor || null;
  let pagesLoaded = 1;

  while (cursor && pagesLoaded < COURSES_MAX_PAGES) {
    const nextPageQuery = `
      query GetAllPortalCoursesNextPage($cursor: String!, $columnIds: [String!]) {
        next_items_page(limit: ${COURSES_PAGE_LIMIT}, cursor: $cursor) {
          cursor
          items {
            id
            name
            column_values(ids: $columnIds) {
              ${COLUMN_VALUE_FIELDS}
            }
          }
        }
      }
    `;

    const nextPage = await fetchQuery<NextItemsPageResponse>(nextPageQuery, {
      cursor,
      columnIds: COURSE_COLUMN_IDS,
    });

    items.push(...(nextPage.next_items_page.items || []));
    cursor = nextPage.next_items_page.cursor || null;
    pagesLoaded += 1;
  }

  return items;
}

const getAllPortalCoursesCached = unstable_cache(
  async (): Promise<PortalCourse[]> => {
    const items = await getAllPortalCourseItems();
    return items.map((item) => parseCourseItem(item)).sort(comparePortalCoursesByDateDesc);
  },
  ["portal-all-courses"],
  { revalidate: 60 },
);

export async function getAllPortalCourses(): Promise<PortalCourse[]> {
  if (isMondayPreviewMode()) {
    return getMockPortalCourses();
  }

  return getAllPortalCoursesCached();
}
