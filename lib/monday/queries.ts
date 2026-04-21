import { unstable_cache } from "next/cache";

import {
  ACTIVE_PAYMENT_STATUS_INDEXES,
  BOARD_IDS,
  COURSE_COLUMNS,
  COURSE_STATE_LABELS,
  DEFAULT_STATUS_LABEL,
  PAYMENT_REQUEST_COLUMNS,
  PAYMENT_REQUEST_STATUS_LABELS,
  PAYMENT_TYPE_INDEXES,
  PAYMENT_TYPE_LABELS,
  PRIVATE_LESSON_COLUMNS,
  PRIVATE_LESSON_STATUS_LABELS,
  SUPPLIER_COLUMNS,
  TEACHER_COLUMNS,
} from "@/lib/monday/constants";
import { fetchMutation, fetchQuery } from "@/lib/monday/client";
import { getTodayInIsrael } from "@/lib/utils";
import type {
  Course,
  DuplicatePaymentRequestResult,
  PaymentRequestPayload,
  PaymentType,
  PrivateLesson,
  Replacement,
  ReplacementLookupResult,
  Supplier,
  Teacher,
  TeacherSimple,
} from "@/lib/monday/types";

type ColumnValueResponse = {
  __typename: string;
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
  email?: string | null;
};

type MondayItemResponse = {
  id: string;
  name: string;
  column_values: ColumnValueResponse[];
};

type ItemsResponse = {
  items: MondayItemResponse[];
};

type BoardsItemsResponse = {
  boards: Array<{
    items_page: {
      items: MondayItemResponse[];
    };
  }>;
};

type CreateItemResponse = {
  create_item: {
    id: string;
    name: string;
  };
};

type CreateUpdateResponse = {
  create_update: {
    id: string;
  };
};

const COLUMN_VALUE_FIELDS = `
  __typename
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
  ... on MirrorValue {
    display_value
  }
  ... on EmailValue {
    email
    label
  }
  ... on FormulaValue {
    display_value
  }
`;

const TEACHER_COLUMN_IDS = [
  TEACHER_COLUMNS.EMAIL,
  TEACHER_COLUMNS.SUPPLIER_RELATION,
  TEACHER_COLUMNS.SUPPLIER_FILE_STATUS,
  TEACHER_COLUMNS.COURSES_RELATION,
  TEACHER_COLUMNS.PRIVATE_LESSONS_RELATION,
];

function getColumn(item: MondayItemResponse, columnId: string) {
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

function formatUpdateMoney(value: number) {
  return `${new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 }).format(value)} ש"ח`;
}

function buildReplacementUpdateBody(summary: NonNullable<PaymentRequestPayload["deductionSummary"]>) {
  const lines = summary.replacements.map(
    (replacement) =>
      `- ${replacement.replacementDate} - ${replacement.replacingTeacherName} - ${formatUpdateMoney(replacement.totalAmount)}`,
  );

  return [
    `קוזזו ${formatUpdateMoney(summary.totalSuggestedDeduction)} בגין ההחלפות הבאות:`,
    ...lines,
  ].join("\n");
}

function parseTeacher(item: MondayItemResponse): Teacher {
  const supplierRelation = getColumn(item, TEACHER_COLUMNS.SUPPLIER_RELATION);

  return {
    id: Number(item.id),
    name: item.name,
    email: getColumn(item, TEACHER_COLUMNS.EMAIL)?.email || getColumn(item, TEACHER_COLUMNS.EMAIL)?.text || "",
    supplierRelationId: parseLinkedIds(supplierRelation)[0] ?? null,
    supplierFileStatus:
      getColumn(item, TEACHER_COLUMNS.SUPPLIER_FILE_STATUS)?.label ||
      getColumn(item, TEACHER_COLUMNS.SUPPLIER_FILE_STATUS)?.text ||
      "",
    coursesRelationIds: parseLinkedIds(getColumn(item, TEACHER_COLUMNS.COURSES_RELATION)),
    privateLessonsRelationIds: parseLinkedIds(getColumn(item, TEACHER_COLUMNS.PRIVATE_LESSONS_RELATION)),
  };
}

function parseSupplier(item: MondayItemResponse): Supplier {
  return {
    id: Number(item.id),
    name: item.name,
    fileStatus:
      getColumn(item, SUPPLIER_COLUMNS.SUPPLIER_FILE_STATUS)?.label ||
      getColumn(item, SUPPLIER_COLUMNS.SUPPLIER_FILE_STATUS)?.text ||
      "",
    taxValidityDate: getColumn(item, SUPPLIER_COLUMNS.TAX_VALIDITY_DATE)?.date || null,
    email: getColumn(item, SUPPLIER_COLUMNS.EMAIL)?.email || getColumn(item, SUPPLIER_COLUMNS.EMAIL)?.text || "",
    idNumber: getColumn(item, SUPPLIER_COLUMNS.ID_NUMBER)?.text || "",
    employmentStatus:
      getColumn(item, SUPPLIER_COLUMNS.EMPLOYMENT_STATUS)?.label ||
      getColumn(item, SUPPLIER_COLUMNS.EMPLOYMENT_STATUS)?.text ||
      "",
  };
}

function parseCourse(item: MondayItemResponse): Course {
  return {
    id: Number(item.id),
    name: item.name,
    startDate: getColumn(item, COURSE_COLUMNS.START_DATE)?.date || null,
    endDate: getColumn(item, COURSE_COLUMNS.END_DATE)?.date || null,
    teachingRate: parseNumber(getColumn(item, COURSE_COLUMNS.TEACHING_RATE)),
    travelRate: parseNumber(getColumn(item, COURSE_COLUMNS.TRAVEL_RATE)),
    state: getColumn(item, COURSE_COLUMNS.COURSE_STATE)?.label || getColumn(item, COURSE_COLUMNS.COURSE_STATE)?.text || "",
  };
}

function parsePrivateLesson(item: MondayItemResponse): PrivateLesson {
  return {
    id: Number(item.id),
    studentName: getColumn(item, PRIVATE_LESSON_COLUMNS.STUDENT_NAME)?.text || item.name,
    lessonsPurchased: parseNumber(getColumn(item, PRIVATE_LESSON_COLUMNS.LESSONS_PURCHASED)) || 0,
    lessonsHeld: parseNumber(getColumn(item, PRIVATE_LESSON_COLUMNS.LESSONS_HELD)) || 0,
    lessonsRemaining: parseNumber(getColumn(item, PRIVATE_LESSON_COLUMNS.LESSONS_REMAINING)) || 0,
    status: getColumn(item, PRIVATE_LESSON_COLUMNS.STATUS)?.label || getColumn(item, PRIVATE_LESSON_COLUMNS.STATUS)?.text || "",
  };
}

async function getItemsByIds(ids: number[], columnIds: string[]): Promise<MondayItemResponse[]> {
  if (!ids.length) {
    return [];
  }

  const query = `
    query GetItemsByIds($ids: [ID!]!, $columnIds: [String!]) {
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
    ids,
    columnIds,
  });

  return response.items;
}

export async function getTeacherById(teacherId: number): Promise<Teacher | null> {
  const items = await getItemsByIds([teacherId], TEACHER_COLUMN_IDS);
  const teacher = items[0];

  return teacher ? parseTeacher(teacher) : null;
}

export async function getCourseById(courseId: number): Promise<Course | null> {
  const items = await getItemsByIds([courseId], [
    COURSE_COLUMNS.START_DATE,
    COURSE_COLUMNS.END_DATE,
    COURSE_COLUMNS.TEACHING_RATE,
    COURSE_COLUMNS.TRAVEL_RATE,
    COURSE_COLUMNS.COURSE_STATE,
  ]);

  const course = items[0];
  return course ? parseCourse(course) : null;
}

export async function getPrivateLessonById(privateLessonId: number): Promise<PrivateLesson | null> {
  const items = await getItemsByIds([privateLessonId], [
    PRIVATE_LESSON_COLUMNS.STUDENT_NAME,
    PRIVATE_LESSON_COLUMNS.STATUS,
    PRIVATE_LESSON_COLUMNS.LESSONS_PURCHASED,
    PRIVATE_LESSON_COLUMNS.LESSONS_HELD,
    PRIVATE_LESSON_COLUMNS.LESSONS_REMAINING,
  ]);

  const lesson = items[0];
  return lesson ? parsePrivateLesson(lesson) : null;
}

export async function getActiveTeachers(): Promise<Teacher[]> {
  const query = `
    query GetActiveTeachers($boardId: [ID!], $columnIds: [String!]) {
      boards(ids: $boardId) {
        items_page(
          limit: 500
          query_params: {
            rules: [
              {
                column_id: "${TEACHER_COLUMNS.ACTIVE_STATUS}"
                compare_value: ["פעיל"]
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
    boardId: [BOARD_IDS.TEACHERS],
    columnIds: TEACHER_COLUMN_IDS,
  });

  return (response.boards[0]?.items_page.items || [])
    .map(parseTeacher)
    .sort((left, right) => left.name.localeCompare(right.name, "he"));
}

export async function getSupplierById(supplierId: number): Promise<Supplier | null> {
  const items = await getItemsByIds([supplierId], [
    SUPPLIER_COLUMNS.SUPPLIER_FILE_STATUS,
    SUPPLIER_COLUMNS.TAX_VALIDITY_DATE,
    SUPPLIER_COLUMNS.EMAIL,
    SUPPLIER_COLUMNS.ID_NUMBER,
    SUPPLIER_COLUMNS.EMPLOYMENT_STATUS,
  ]);

  const supplier = items[0];
  return supplier ? parseSupplier(supplier) : null;
}

const getCoursesForTeacherCached = unstable_cache(
  async (teacherId: number) => {
    const teacher = await getTeacherById(teacherId);
    if (!teacher?.coursesRelationIds.length) {
      return [];
    }

    const items = await getItemsByIds(teacher.coursesRelationIds, [
      COURSE_COLUMNS.START_DATE,
      COURSE_COLUMNS.END_DATE,
      COURSE_COLUMNS.TEACHING_RATE,
      COURSE_COLUMNS.TRAVEL_RATE,
      COURSE_COLUMNS.COURSE_STATE,
    ]);

    const allowedStates = new Set([
      COURSE_STATE_LABELS.RUNNING,
      COURSE_STATE_LABELS.FINISHED,
      COURSE_STATE_LABELS.UPCOMING,
    ]);

    return items
      .map(parseCourse)
      .filter((course) => allowedStates.has(course.state))
      .sort((left, right) => left.name.localeCompare(right.name, "he"));
  },
  ["courses-for-teacher"],
  { revalidate: 30 },
);

export async function getCoursesForTeacher(teacherId: number): Promise<Course[]> {
  return getCoursesForTeacherCached(teacherId);
}

export async function getAllActiveTeachers(): Promise<TeacherSimple[]> {
  const teachers = await getActiveTeachers();
  return teachers.map((teacher) => ({
    id: teacher.id,
    name: teacher.name,
  }));
}

export async function getPrivateLessonsForTeacher(teacherId: number): Promise<PrivateLesson[]> {
  const teacher = await getTeacherById(teacherId);
  if (!teacher?.privateLessonsRelationIds.length) {
    return [];
  }

  const items = await getItemsByIds(teacher.privateLessonsRelationIds, [
    PRIVATE_LESSON_COLUMNS.STUDENT_NAME,
    PRIVATE_LESSON_COLUMNS.STATUS,
    PRIVATE_LESSON_COLUMNS.LESSONS_PURCHASED,
    PRIVATE_LESSON_COLUMNS.LESSONS_HELD,
    PRIVATE_LESSON_COLUMNS.LESSONS_REMAINING,
  ]);

  const allowedStatuses = new Set([
    PRIVATE_LESSON_STATUS_LABELS.ASSIGNED,
    PRIVATE_LESSON_STATUS_LABELS.EMAIL_SENT,
    PRIVATE_LESSON_STATUS_LABELS.RUNNING,
  ]);

  return items
    .map(parsePrivateLesson)
    .filter((lesson) => allowedStatuses.has(lesson.status))
    .sort((left, right) => left.studentName.localeCompare(right.studentName, "he"));
}

export async function checkDuplicatePaymentRequest(
  teacherId: number,
  courseId: number,
): Promise<DuplicatePaymentRequestResult> {
  const query = `
    query CheckDuplicatePaymentRequest {
      boards(ids: [${BOARD_IDS.PAYMENT_REQUESTS}]) {
        items_page(
          limit: 1
          query_params: {
            operator: and
            rules: [
              {
                column_id: "${PAYMENT_REQUEST_COLUMNS.SUBMITTER}"
                compare_value: [${teacherId}]
                operator: any_of
              }
              {
                column_id: "${PAYMENT_REQUEST_COLUMNS.COURSE}"
                compare_value: [${courseId}]
                operator: any_of
              }
              {
                column_id: "${PAYMENT_REQUEST_COLUMNS.PAYMENT_TYPE}"
                compare_value: [${PAYMENT_TYPE_INDEXES.COURSE}]
                operator: any_of
              }
              {
                column_id: "${PAYMENT_REQUEST_COLUMNS.STATUS}"
                compare_value: [${ACTIVE_PAYMENT_STATUS_INDEXES.join(",")}]
                operator: any_of
              }
            ]
          }
        ) {
          items {
            id
            name
            column_values(ids: ["${PAYMENT_REQUEST_COLUMNS.STATUS}", "${PAYMENT_REQUEST_COLUMNS.SUBMIT_DATE}"]) {
              ${COLUMN_VALUE_FIELDS}
            }
          }
        }
      }
    }
  `;

  const response = await fetchQuery<BoardsItemsResponse>(query);
  const existingItem = response.boards[0]?.items_page.items[0];

  if (!existingItem) {
    return { isDuplicate: false };
  }

  return {
    isDuplicate: true,
    existingItem: {
      id: Number(existingItem.id),
      name: existingItem.name,
      status:
        getColumn(existingItem, PAYMENT_REQUEST_COLUMNS.STATUS)?.label ||
        PAYMENT_REQUEST_STATUS_LABELS.NEW,
      submitDate: getColumn(existingItem, PAYMENT_REQUEST_COLUMNS.SUBMIT_DATE)?.date || null,
    },
  };
}

export async function findReplacementsForCourse(
  teacherId: number,
  courseId: number,
): Promise<Replacement[]> {
  const query = `
    query FindReplacementsForCourse {
      boards(ids: [${BOARD_IDS.PAYMENT_REQUESTS}]) {
        items_page(
          limit: 100
          query_params: {
            operator: and
            rules: [
              {
                column_id: "${PAYMENT_REQUEST_COLUMNS.PAYMENT_TYPE}"
                compare_value: [${PAYMENT_TYPE_INDEXES.REPLACEMENT}]
                operator: any_of
              }
              {
                column_id: "${PAYMENT_REQUEST_COLUMNS.COURSE}"
                compare_value: [${courseId}]
                operator: any_of
              }
              {
                column_id: "${PAYMENT_REQUEST_COLUMNS.REPLACED_TEACHER}"
                compare_value: [${teacherId}]
                operator: any_of
              }
              {
                column_id: "${PAYMENT_REQUEST_COLUMNS.STATUS}"
                compare_value: [${ACTIVE_PAYMENT_STATUS_INDEXES.join(",")}]
                operator: any_of
              }
            ]
          }
        ) {
          items {
            id
            name
            column_values(ids: [
              "${PAYMENT_REQUEST_COLUMNS.SUBMITTER}",
              "${PAYMENT_REQUEST_COLUMNS.REPLACEMENT_DATE}",
              "${PAYMENT_REQUEST_COLUMNS.TEACHING_AMOUNT}",
              "${PAYMENT_REQUEST_COLUMNS.TRAVEL_AMOUNT}"
            ]) {
              ${COLUMN_VALUE_FIELDS}
            }
          }
        }
      }
    }
  `;

  const response = await fetchQuery<BoardsItemsResponse>(query);
  const items = response.boards[0]?.items_page.items || [];

  return items.map((item) => {
    const submitter = getColumn(item, PAYMENT_REQUEST_COLUMNS.SUBMITTER);
    const teachingAmount = parseNumber(getColumn(item, PAYMENT_REQUEST_COLUMNS.TEACHING_AMOUNT)) || 0;
    const travelAmount = parseNumber(getColumn(item, PAYMENT_REQUEST_COLUMNS.TRAVEL_AMOUNT)) || 0;

    return {
      id: Number(item.id),
      replacingTeacherName:
        submitter?.linked_items?.[0]?.name || submitter?.display_value || "מורה מחליף",
      replacementDate: getColumn(item, PAYMENT_REQUEST_COLUMNS.REPLACEMENT_DATE)?.text || "",
      teachingAmount,
      travelAmount,
      totalAmount: teachingAmount + travelAmount,
    };
  });
}

export async function getReplacementLookupResult(
  teacherId: number,
  courseId: number,
): Promise<ReplacementLookupResult> {
  const replacements = await findReplacementsForCourse(teacherId, courseId);
  const totalSuggestedDeduction = replacements.reduce(
    (sum, replacement) => sum + replacement.totalAmount,
    0,
  );

  return {
    replacements,
    totalSuggestedDeduction,
  };
}

function getPaymentTypeLabel(paymentType: PaymentType) {
  switch (paymentType) {
    case "course":
      return PAYMENT_TYPE_LABELS.COURSE;
    case "replacement":
      return PAYMENT_TYPE_LABELS.REPLACEMENT;
    case "other":
      return PAYMENT_TYPE_LABELS.OTHER;
    case "private_lessons":
      return PAYMENT_TYPE_LABELS.PRIVATE_LESSONS;
    default:
      return PAYMENT_TYPE_LABELS.OTHER;
  }
}

export async function createPaymentRequestUpdate(itemId: number, body: string): Promise<void> {
  const mutation = `
    mutation CreatePaymentRequestUpdate($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) {
        id
      }
    }
  `;

  await fetchMutation<CreateUpdateResponse>(mutation, {
    itemId,
    body,
  });
}

export async function createPaymentRequest(data: PaymentRequestPayload): Promise<{ itemId: number }> {
  const today = getTodayInIsrael();
  const paymentLabel = getPaymentTypeLabel(data.paymentType);

  let subject = "";
  if (data.paymentType === "course" || data.paymentType === "replacement") {
    const course = data.courseId ? await getCourseById(data.courseId) : null;
    subject = course?.name || "קורס";
  } else if (data.paymentType === "private_lessons") {
    const privateLesson = data.privateLessonId ? await getPrivateLessonById(data.privateLessonId) : null;
    subject = privateLesson?.studentName || "שיעור פרטי";
  } else {
    subject = (data.details || "אחר").trim().slice(0, 30);
  }

  const itemName = `${paymentLabel} - ${data.teacherName} - ${subject}`;

  const columnValues: Record<string, unknown> = {
    [PAYMENT_REQUEST_COLUMNS.SUBMITTER]: { item_ids: [data.submitterId] },
    [PAYMENT_REQUEST_COLUMNS.SUPPLIER]: { item_ids: [data.supplierId] },
    [PAYMENT_REQUEST_COLUMNS.PAYMENT_TYPE]: { label: paymentLabel },
    [PAYMENT_REQUEST_COLUMNS.STATUS]: { label: DEFAULT_STATUS_LABEL },
    [PAYMENT_REQUEST_COLUMNS.SUBMIT_DATE]: { date: today },
    [PAYMENT_REQUEST_COLUMNS.ITEM_NAME]: itemName,
  };

  if (data.paymentType === "course") {
    columnValues[PAYMENT_REQUEST_COLUMNS.COURSE] = { item_ids: [data.courseId] };
    columnValues[PAYMENT_REQUEST_COLUMNS.TEACHING_AMOUNT] = data.teachingAmount;
    columnValues[PAYMENT_REQUEST_COLUMNS.TRAVEL_AMOUNT] = data.travelAmount ?? 0;
  }

  if (data.paymentType === "replacement") {
    columnValues[PAYMENT_REQUEST_COLUMNS.COURSE] = { item_ids: [data.courseId] };
    columnValues[PAYMENT_REQUEST_COLUMNS.REPLACED_TEACHER] = { item_ids: [data.replacedTeacherId] };
    columnValues[PAYMENT_REQUEST_COLUMNS.REPLACEMENT_DATE] = data.replacementDate;
    columnValues[PAYMENT_REQUEST_COLUMNS.TEACHING_AMOUNT] = data.teachingAmount;
    columnValues[PAYMENT_REQUEST_COLUMNS.TRAVEL_AMOUNT] = data.travelAmount ?? 0;
  }

  if (data.paymentType === "other") {
    columnValues[PAYMENT_REQUEST_COLUMNS.DETAILS] = data.details;
    columnValues[PAYMENT_REQUEST_COLUMNS.TEACHING_AMOUNT] = data.amount;
  }

  if (data.paymentType === "private_lessons") {
    columnValues[PAYMENT_REQUEST_COLUMNS.PRIVATE_LESSONS] = { item_ids: [data.privateLessonId] };
    columnValues[PAYMENT_REQUEST_COLUMNS.LESSONS_COUNT] = data.lessonsCount;
    columnValues[PAYMENT_REQUEST_COLUMNS.TOTAL_TRANSFER] = data.totalTransfer;
  }

  const mutation = `
    mutation CreatePaymentRequest(
      $boardId: ID!,
      $itemName: String!,
      $columnValues: JSON!
    ) {
      create_item(
        board_id: $boardId,
        item_name: $itemName,
        column_values: $columnValues
      ) {
        id
        name
      }
    }
  `;

  const response = await fetchMutation<CreateItemResponse>(mutation, {
    boardId: BOARD_IDS.PAYMENT_REQUESTS,
    itemName,
    columnValues: JSON.stringify(columnValues),
  });

  const itemId = Number(response.create_item.id);

  if (data.deductionSummary?.applied && data.deductionSummary.replacements.length) {
    try {
      await createPaymentRequestUpdate(itemId, buildReplacementUpdateBody(data.deductionSummary));
    } catch (error) {
      console.warn("[Monday API] Failed to create payment request update", error);
    }
  }

  return {
    itemId,
  };
}
