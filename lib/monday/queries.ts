import {
  BOARD_IDS,
  COURSE_COLUMNS,
  COURSE_STATE_LABELS,
  DEFAULT_STATUS_LABEL,
  PAYMENT_REQUEST_COLUMNS,
  PAYMENT_TYPE_LABELS,
  PRIVATE_LESSON_COLUMNS,
  PRIVATE_LESSON_STATUS_LABELS,
  SUPPLIER_COLUMNS,
  TEACHER_COLUMNS,
} from "@/lib/monday/constants";
import { fetchQuery } from "@/lib/monday/client";
import { getTodayInIsrael } from "@/lib/utils";
import type {
  Course,
  PaymentRequestInput,
  PaymentType,
  PrivateLesson,
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

function parseTeacher(item: MondayItemResponse): Teacher {
  const supplierRelation = getColumn(item, TEACHER_COLUMNS.SUPPLIER_RELATION);

  return {
    id: Number(item.id),
    name: item.name,
    email: getColumn(item, TEACHER_COLUMNS.EMAIL)?.email || getColumn(item, TEACHER_COLUMNS.EMAIL)?.text || "",
    supplierRelationId: parseLinkedIds(supplierRelation)[0] ?? null,
    supplierFileStatus: getColumn(item, TEACHER_COLUMNS.SUPPLIER_FILE_STATUS)?.label || getColumn(item, TEACHER_COLUMNS.SUPPLIER_FILE_STATUS)?.text || "",
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

  return (response.boards[0]?.items_page.items || []).map(parseTeacher).sort((left, right) => left.name.localeCompare(right.name, "he"));
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

export async function getCoursesForTeacher(teacherId: number): Promise<Course[]> {
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

export async function createPaymentRequest(
  data: PaymentRequestInput & { teacherName: string },
): Promise<{ itemId: number }> {
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

  const response = await fetchQuery<CreateItemResponse>(mutation, {
    boardId: BOARD_IDS.PAYMENT_REQUESTS,
    itemName,
    columnValues: JSON.stringify(columnValues),
  });

  return {
    itemId: Number(response.create_item.id),
  };
}
