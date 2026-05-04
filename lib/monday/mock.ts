import {
  COURSE_STATE_LABELS,
  PRIVATE_LESSON_STATUS_LABELS,
  SUPPLIER_FILE_STATUS_LABELS,
  TEACHER_SUPPLIER_STATUS_LABELS,
} from "@/lib/monday/constants";
import type {
  Course,
  CourseMeetingsState,
  DuplicatePaymentRequestResult,
  PaymentRequestPayload,
  PrivateLesson,
  ReplacementLookupResult,
  SupplierCheckResult,
  Teacher,
} from "@/lib/monday/types";

const MOCK_TEACHERS: Teacher[] = [
  {
    id: 101,
    name: "יעל כהן",
    email: "yael@example.com",
    supplierRelationId: 1001,
    supplierFileStatus: TEACHER_SUPPLIER_STATUS_LABELS.ALL_GOOD,
    coursesRelationIds: [7001, 7002, 7003, 7004, 7005, 7006],
    privateLessonsRelationIds: [9001, 9002],
  },
  {
    id: 102,
    name: "אמיר לוי",
    email: "amir@example.com",
    supplierRelationId: 1002,
    supplierFileStatus: TEACHER_SUPPLIER_STATUS_LABELS.ALL_GOOD,
    coursesRelationIds: [7101, 7102],
    privateLessonsRelationIds: [9101],
  },
  {
    id: 103,
    name: "דנה חסומה",
    email: "dana@example.com",
    supplierRelationId: 1003,
    supplierFileStatus: TEACHER_SUPPLIER_STATUS_LABELS.DOCUMENTS_EXPIRED,
    coursesRelationIds: [7201],
    privateLessonsRelationIds: [],
  },
];

const MOCK_COURSES_BY_TEACHER: Record<number, Course[]> = {
  101: [
    {
      id: 7001,
      name: "ערבית מדוברת רמה 1 - ללא דרישות",
      startDate: "2026-01-01",
      endDate: "2026-03-30",
      teachingRate: 3000,
      travelRate: 300,
      lessonsCount: 12,
      state: COURSE_STATE_LABELS.FINISHED,
    },
    {
      id: 7002,
      name: "ערבית מדוברת רמה 2 - הוגשו 6",
      startDate: "2026-02-01",
      endDate: "2026-04-30",
      teachingRate: 3000,
      travelRate: 240,
      lessonsCount: 12,
      state: COURSE_STATE_LABELS.FINISHED,
    },
    {
      id: 7003,
      name: "ערבית למתקדמים - הוגשו 12",
      startDate: "2025-11-01",
      endDate: "2026-01-30",
      teachingRate: 3600,
      travelRate: 0,
      lessonsCount: 12,
      state: COURSE_STATE_LABELS.FINISHED,
    },
    {
      id: 7004,
      name: "קורס רץ - זמין להחלפה בלבד",
      startDate: "2026-04-01",
      endDate: "2026-06-30",
      teachingRate: 3000,
      travelRate: 300,
      lessonsCount: 12,
      state: COURSE_STATE_LABELS.RUNNING,
    },
    {
      id: 7005,
      name: "קורס חסר מספר מפגשים",
      startDate: "2026-01-15",
      endDate: "2026-03-15",
      teachingRate: 2500,
      travelRate: 200,
      lessonsCount: null,
      state: COURSE_STATE_LABELS.FINISHED,
    },
    {
      id: 7006,
      name: "קורס עם דרישה ישנה",
      startDate: "2025-12-01",
      endDate: "2026-02-28",
      teachingRate: 2800,
      travelRate: 250,
      lessonsCount: 12,
      state: COURSE_STATE_LABELS.FINISHED,
    },
  ],
  102: [
    {
      id: 7101,
      name: "עברית למתחילים - רץ",
      startDate: "2026-04-12",
      endDate: "2026-06-12",
      teachingRate: 2100,
      travelRate: 150,
      lessonsCount: 10,
      state: COURSE_STATE_LABELS.RUNNING,
    },
    {
      id: 7102,
      name: "עברית למתחילים - הסתיים",
      startDate: "2026-01-12",
      endDate: "2026-03-12",
      teachingRate: 2100,
      travelRate: 150,
      lessonsCount: 10,
      state: COURSE_STATE_LABELS.FINISHED,
    },
  ],
  103: [
    {
      id: 7201,
      name: "קורס דוגמה חסום",
      startDate: "2026-01-01",
      endDate: "2026-03-30",
      teachingRate: 1800,
      travelRate: 120,
      lessonsCount: 8,
      state: COURSE_STATE_LABELS.FINISHED,
    },
  ],
};

const MOCK_PRIVATE_LESSONS_BY_TEACHER: Record<number, PrivateLesson[]> = {
  101: [
    {
      id: 9001,
      studentName: "נועם ישראלי",
      lessonsPurchased: 10,
      lessonsHeld: 6,
      lessonsRemaining: 4,
      status: PRIVATE_LESSON_STATUS_LABELS.RUNNING,
    },
    {
      id: 9002,
      studentName: "רוני עזרא",
      lessonsPurchased: 8,
      lessonsHeld: 2,
      lessonsRemaining: 6,
      status: PRIVATE_LESSON_STATUS_LABELS.EMAIL_SENT,
    },
  ],
  102: [
    {
      id: 9101,
      studentName: "איתי כהן",
      lessonsPurchased: 12,
      lessonsHeld: 5,
      lessonsRemaining: 7,
      status: PRIVATE_LESSON_STATUS_LABELS.ASSIGNED,
    },
  ],
};

const MOCK_COURSE_MEETINGS_STATE: Record<number, CourseMeetingsState> = {
  7001: {
    courseId: 7001,
    courseName: "ערבית מדוברת רמה 1 - ללא דרישות",
    totalMeetings: 12,
    existingClaims: [],
    submittedMeetingsTotal: 0,
    remainingMeetings: 12,
    hasLegacyClaimsWithoutMeetings: false,
    warnings: [],
  },
  7002: {
    courseId: 7002,
    courseName: "ערבית מדוברת רמה 2 - הוגשו 6",
    totalMeetings: 12,
    existingClaims: [
      {
        itemId: 555001,
        teacherId: 101,
        teacherName: "יעל כהן",
        requestType: "קורס",
        meetingsCount: 6,
        statusLabel: "ממתין לאישור מנהל",
        isLegacyWithoutMeetings: false,
      },
    ],
    submittedMeetingsTotal: 6,
    remainingMeetings: 6,
    hasLegacyClaimsWithoutMeetings: false,
    warnings: [],
  },
  7003: {
    courseId: 7003,
    courseName: "ערבית למתקדמים - הוגשו 12",
    totalMeetings: 12,
    existingClaims: [
      {
        itemId: 555002,
        teacherId: 101,
        teacherName: "יעל כהן",
        requestType: "קורס",
        meetingsCount: 12,
        statusLabel: "שולם",
        isLegacyWithoutMeetings: false,
      },
    ],
    submittedMeetingsTotal: 12,
    remainingMeetings: 0,
    hasLegacyClaimsWithoutMeetings: false,
    warnings: [],
  },
  7004: {
    courseId: 7004,
    courseName: "קורס רץ - זמין להחלפה בלבד",
    totalMeetings: 12,
    existingClaims: [],
    submittedMeetingsTotal: 0,
    remainingMeetings: 12,
    hasLegacyClaimsWithoutMeetings: false,
    warnings: [],
  },
  7005: {
    courseId: 7005,
    courseName: "קורס חסר מספר מפגשים",
    totalMeetings: null,
    existingClaims: [],
    submittedMeetingsTotal: 0,
    remainingMeetings: null,
    hasLegacyClaimsWithoutMeetings: false,
    warnings: ["חסר מספר מפגשים בקורס."],
  },
  7006: {
    courseId: 7006,
    courseName: "קורס עם דרישה ישנה",
    totalMeetings: 12,
    existingClaims: [
      {
        itemId: 555003,
        teacherId: 101,
        teacherName: "יעל כהן",
        requestType: "קורס",
        meetingsCount: null,
        statusLabel: "דרישת תשלום חדשה",
        isLegacyWithoutMeetings: true,
      },
    ],
    submittedMeetingsTotal: 0,
    remainingMeetings: 12,
    hasLegacyClaimsWithoutMeetings: true,
    warnings: ["קיימת דרישה ישנה על הקורס ללא מספר מפגשים."],
  },
};

export function isMondayPreviewMode() {
  return (
    process.env.MONDAY_PREVIEW_MODE === "true" ||
    (process.env.NODE_ENV !== "production" && !process.env.MONDAY_API_TOKEN)
  );
}

export function getMockTeachers() {
  return MOCK_TEACHERS;
}

export function getMockCoursesForTeacher(teacherId: number) {
  return MOCK_COURSES_BY_TEACHER[teacherId] ?? [];
}

export function getMockCourseMeetingsState(courseId: number): CourseMeetingsState {
  const state = MOCK_COURSE_MEETINGS_STATE[courseId];

  if (state) {
    return state;
  }

  return {
    courseId,
    courseName: "קורס לא מוכר",
    totalMeetings: null,
    existingClaims: [],
    submittedMeetingsTotal: 0,
    remainingMeetings: null,
    hasLegacyClaimsWithoutMeetings: false,
    warnings: ["לא נמצא mock לקורס המבוקש."],
  };
}

export function getMockPrivateLessonsForTeacher(teacherId: number) {
  return MOCK_PRIVATE_LESSONS_BY_TEACHER[teacherId] ?? [];
}

export function getMockSupplierCheck(teacherId: number): SupplierCheckResult {
  const teacher = MOCK_TEACHERS.find((entry) => entry.id === teacherId);

  if (!teacher) {
    return {
      blocked: true,
      reason: "לא נמצא מורה לדוגמה במצב preview.",
      teacherSupplierStatus: TEACHER_SUPPLIER_STATUS_LABELS.DOCUMENTS_EXPIRED,
      supplierFileStatus: SUPPLIER_FILE_STATUS_LABELS.DOCUMENTS_EXPIRED,
      taxValidityDate: null,
      supplierId: null,
    };
  }

  if (teacherId === 103) {
    return {
      blocked: true,
      reason: "חסרים מסמכי ספק בתוקף",
      teacherSupplierStatus: TEACHER_SUPPLIER_STATUS_LABELS.DOCUMENTS_EXPIRED,
      supplierFileStatus: SUPPLIER_FILE_STATUS_LABELS.DOCUMENTS_EXPIRED,
      taxValidityDate: "2025-01-01",
      supplierId: teacher.supplierRelationId,
    };
  }

  return {
    blocked: false,
    reason: null,
    teacherSupplierStatus: TEACHER_SUPPLIER_STATUS_LABELS.ALL_GOOD,
    supplierFileStatus: SUPPLIER_FILE_STATUS_LABELS.ALL_GOOD,
    taxValidityDate: "2027-12-31",
    supplierId: teacher.supplierRelationId,
  };
}

export function getMockDuplicatePaymentRequest(
  teacherId: number,
  courseId: number,
): DuplicatePaymentRequestResult {
  if (teacherId === 101 && courseId === 7002) {
    return {
      isDuplicate: true,
      existingItem: {
        id: 555001,
        name: "קורס - יעל כהן - ערבית מדוברת רמה 2",
        status: "ממתין לאישור מנהל",
        submitDate: "2026-04-15",
      },
    };
  }

  return { isDuplicate: false };
}

export function getMockReplacementLookup(
  teacherId: number,
  courseId: number,
): ReplacementLookupResult {
  if (teacherId === 101 && courseId === 7004) {
    return {
      replacements: [
        {
          id: 88001,
          replacingTeacherName: "אמיר לוי",
          replacementDate: "12/05/2026",
          teachingAmount: 500,
          travelAmount: 50,
          totalAmount: 550,
        },
      ],
      totalSuggestedDeduction: 550,
    };
  }

  return {
    replacements: [],
    totalSuggestedDeduction: 0,
  };
}

export function createMockPaymentRequest(_payload: PaymentRequestPayload) {
  void _payload;

  return {
    itemId: 990000 + Math.floor(Math.random() * 1000),
  };
}
