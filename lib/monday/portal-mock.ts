// Preview/mock data for the Teacher Portal.
// Active whenever Monday preview mode is on (no MONDAY_API_TOKEN) so every
// portal screen works locally without real credentials.
//
// The base mock identities below are owned by the auth foundation; service
// workstreams extend this file with courses/meetings/attendance/notebook
// mocks without changing existing exports.

import { COURSE_STATE_LABELS, PRIVATE_LESSON_STATUS_LABELS } from "@/lib/monday/constants";
import type {
  AttendanceEntry,
  MeetingStudent,
  PortalCourse,
  PortalMeeting,
  PrivateCourseNotebook,
  PortalTeacher,
} from "@/lib/monday/portal-types";

export const MOCK_PORTAL_TEACHERS: PortalTeacher[] = [
  {
    itemId: 101,
    name: "יעל כהן",
    email: "yael@example.com",
    phone: "050-1234567",
    isActive: true,
    supplierFileStatus: "הכל פיקס",
    appAccessStatus: "approved",
    role: "teacher",
    mentorItemId: 102,
  },
  {
    itemId: 102,
    name: "אמיר לוי",
    email: "amir@example.com",
    phone: "052-7654321",
    isActive: true,
    supplierFileStatus: "הכל פיקס",
    appAccessStatus: "approved",
    role: "mentor",
    mentorItemId: null,
  },
  {
    itemId: 103,
    name: "דנה חסומה",
    email: "dana@example.com",
    phone: null,
    isActive: true,
    supplierFileStatus: "מסמכים לא בתוקף",
    appAccessStatus: "approved",
    role: "teacher",
    mentorItemId: 102,
  },
  {
    itemId: 104,
    name: "מיכל מנהלת הכשרה",
    email: "manager@example.com",
    phone: null,
    isActive: true,
    supplierFileStatus: "הכל פיקס",
    appAccessStatus: "approved",
    role: "training_manager",
    mentorItemId: null,
  },
  {
    itemId: 105,
    name: "אבי אדמין",
    email: "admin@example.com",
    phone: null,
    isActive: true,
    supplierFileStatus: "הכל פיקס",
    appAccessStatus: "approved",
    role: "admin",
    mentorItemId: null,
  },
  {
    itemId: 106,
    name: "פנינה ממתינה",
    email: "pending@example.com",
    phone: null,
    isActive: true,
    supplierFileStatus: "בתהליך קליטה",
    appAccessStatus: "pending",
    role: "teacher",
    mentorItemId: null,
  },
  {
    itemId: 107,
    name: "ברוך חסום",
    email: "blocked@example.com",
    phone: null,
    isActive: true,
    supplierFileStatus: "חסום כי חייב קבלה",
    appAccessStatus: "blocked",
    role: "teacher",
    mentorItemId: null,
  },
  // Two items sharing one email — exercises the duplicate-email block.
  {
    itemId: 108,
    name: "כפול ראשון",
    email: "duplicate@example.com",
    phone: null,
    isActive: true,
    supplierFileStatus: "הכל פיקס",
    appAccessStatus: "approved",
    role: "teacher",
    mentorItemId: null,
  },
  {
    itemId: 109,
    name: "כפול שני",
    email: "duplicate@example.com",
    phone: null,
    isActive: true,
    supplierFileStatus: "הכל פיקס",
    appAccessStatus: "approved",
    role: "teacher",
    mentorItemId: null,
  },
];

export function getMockPortalTeachers(): PortalTeacher[] {
  return MOCK_PORTAL_TEACHERS;
}

export function getMockPortalTeachersByEmail(email: string): PortalTeacher[] {
  const normalized = email.trim().toLowerCase();
  return MOCK_PORTAL_TEACHERS.filter((teacher) => teacher.email.toLowerCase() === normalized);
}

export function getMockPortalTeacherByItemId(itemId: number): PortalTeacher | null {
  return MOCK_PORTAL_TEACHERS.find((teacher) => teacher.itemId === itemId) ?? null;
}

export function getMockTeachersForMentor(mentorItemId: number): PortalTeacher[] {
  return MOCK_PORTAL_TEACHERS.filter((teacher) => teacher.mentorItemId === mentorItemId);
}

// ---------------------------------------------------------------------------
// Portal courses (service workstream additions).
// Mirrors lib/monday/mock.ts MOCK_COURSES_BY_TEACHER names/dates/states,
// converted to PortalCourse. PortalCourse intentionally carries NO rates.
// ---------------------------------------------------------------------------

const MOCK_PORTAL_COURSES: PortalCourse[] = [
  // Teacher 101 — יעל כהן (regular courses 7001-7006).
  {
    itemId: 7001,
    name: "ערבית מדוברת רמה 1 - ללא דרישות",
    kind: "course",
    state: COURSE_STATE_LABELS.FINISHED,
    startDate: "2026-01-01",
    endDate: "2026-03-30",
    lessonsCount: 12,
    teacherItemIds: [101],
    teacherNames: ["יעל כהן"],
    location: "זום",
    zoomLink: "https://zoom.us/j/811111101",
    studentName: null,
  },
  {
    itemId: 7002,
    name: "ערבית מדוברת רמה 2 - הוגשו 6",
    kind: "course",
    state: COURSE_STATE_LABELS.FINISHED,
    startDate: "2026-02-01",
    endDate: "2026-04-30",
    lessonsCount: 12,
    teacherItemIds: [101],
    teacherNames: ["יעל כהן"],
    location: "זום",
    zoomLink: "https://zoom.us/j/811111102",
    studentName: null,
  },
  {
    itemId: 7003,
    name: "ערבית למתקדמים - הוגשו 12",
    kind: "course",
    state: COURSE_STATE_LABELS.FINISHED,
    startDate: "2025-11-01",
    endDate: "2026-01-30",
    lessonsCount: 12,
    teacherItemIds: [101],
    teacherNames: ["יעל כהן"],
    location: null,
    zoomLink: null,
    studentName: null,
  },
  {
    itemId: 7004,
    name: "קורס רץ - זמין להחלפה בלבד",
    kind: "course",
    state: COURSE_STATE_LABELS.RUNNING,
    startDate: "2026-04-01",
    endDate: "2026-06-30",
    lessonsCount: 12,
    teacherItemIds: [101],
    teacherNames: ["יעל כהן"],
    location: "תל אביב, בית הספר",
    zoomLink: null,
    studentName: null,
  },
  {
    itemId: 7005,
    name: "קורס חסר מספר מפגשים",
    kind: "course",
    state: COURSE_STATE_LABELS.FINISHED,
    startDate: "2026-01-15",
    endDate: "2026-03-15",
    lessonsCount: null,
    teacherItemIds: [101],
    teacherNames: ["יעל כהן"],
    location: null,
    zoomLink: null,
    studentName: null,
  },
  {
    itemId: 7006,
    name: "קורס עם דרישה ישנה",
    kind: "course",
    state: COURSE_STATE_LABELS.FINISHED,
    startDate: "2025-12-01",
    endDate: "2026-02-28",
    lessonsCount: 12,
    teacherItemIds: [101],
    teacherNames: ["יעל כהן"],
    location: null,
    zoomLink: null,
    studentName: null,
  },
  // Teacher 101 — private-lesson products.
  {
    itemId: 9001,
    name: "שיעורים פרטיים - נועם ישראלי",
    kind: "private_lessons",
    state: PRIVATE_LESSON_STATUS_LABELS.RUNNING,
    startDate: null,
    endDate: null,
    lessonsCount: 10,
    teacherItemIds: [101],
    teacherNames: ["יעל כהן"],
    location: "זום",
    zoomLink: "https://zoom.us/j/819000001",
    studentName: "נועם ישראלי",
  },
  {
    itemId: 9002,
    name: "שיעורים פרטיים - רוני עזרא",
    kind: "private_lessons",
    state: PRIVATE_LESSON_STATUS_LABELS.EMAIL_SENT,
    startDate: null,
    endDate: null,
    lessonsCount: 8,
    teacherItemIds: [101],
    teacherNames: ["יעל כהן"],
    location: "זום",
    zoomLink: "https://zoom.us/j/819000002",
    studentName: "רוני עזרא",
  },
  // Teacher 102 — אמיר לוי.
  {
    itemId: 7101,
    name: "עברית למתחילים - רץ",
    kind: "course",
    state: COURSE_STATE_LABELS.RUNNING,
    startDate: "2026-04-12",
    endDate: "2026-06-12",
    lessonsCount: 10,
    teacherItemIds: [102],
    teacherNames: ["אמיר לוי"],
    location: "זום",
    zoomLink: "https://zoom.us/j/812222201",
    studentName: null,
  },
  {
    itemId: 7102,
    name: "עברית למתחילים - הסתיים",
    kind: "course",
    state: COURSE_STATE_LABELS.FINISHED,
    startDate: "2026-01-12",
    endDate: "2026-03-12",
    lessonsCount: 10,
    teacherItemIds: [102],
    teacherNames: ["אמיר לוי"],
    location: null,
    zoomLink: null,
    studentName: null,
  },
  {
    itemId: 9101,
    name: "שיעורים פרטיים - איתי כהן",
    kind: "private_lessons",
    state: PRIVATE_LESSON_STATUS_LABELS.ASSIGNED,
    startDate: null,
    endDate: null,
    lessonsCount: 12,
    teacherItemIds: [102],
    teacherNames: ["אמיר לוי"],
    location: "זום",
    zoomLink: "https://zoom.us/j/819100001",
    studentName: "איתי כהן",
  },
  // Teacher 103 — דנה חסומה.
  {
    itemId: 7201,
    name: "קורס דוגמה חסום",
    kind: "course",
    state: COURSE_STATE_LABELS.FINISHED,
    startDate: "2026-01-01",
    endDate: "2026-03-30",
    lessonsCount: 8,
    teacherItemIds: [103],
    teacherNames: ["דנה חסומה"],
    location: null,
    zoomLink: null,
    studentName: null,
  },
];

export function getMockPortalCourses(): PortalCourse[] {
  return MOCK_PORTAL_COURSES;
}

export function getMockPortalCoursesForTeacher(teacherItemId: number): PortalCourse[] {
  return MOCK_PORTAL_COURSES.filter((course) => course.teacherItemIds.includes(teacherItemId));
}

export function getMockPortalCourseById(courseItemId: number): PortalCourse | null {
  return MOCK_PORTAL_COURSES.find((course) => course.itemId === courseItemId) ?? null;
}

// ---------------------------------------------------------------------------
// Portal meetings. Every meeting mirrors a real Monday item shape; dates are
// computed relative to "now" (Israel time) so past/upcoming stay fresh.
// ---------------------------------------------------------------------------

/** The single past mock meeting that already has attendance submitted. */
export const MOCK_ATTENDANCE_SUBMITTED_MEETING_ID = 80012;

function mockDateWithOffset(offsetDays: number): string {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

interface MockMeetingSpec {
  itemId: number;
  courseItemId: number;
  sequence: number;
  offsetDays: number;
  startTime: string;
  durationMinutes: number;
  status: PortalMeeting["status"];
}

const MOCK_MEETING_SPECS: MockMeetingSpec[] = [
  // Course 7001 (finished, zoom) — all past.
  { itemId: 80001, courseItemId: 7001, sequence: 1, offsetDays: -70, startTime: "18:00", durationMinutes: 90, status: "completed" },
  { itemId: 80002, courseItemId: 7001, sequence: 2, offsetDays: -63, startTime: "18:00", durationMinutes: 90, status: "completed" },
  { itemId: 80003, courseItemId: 7001, sequence: 3, offsetDays: -56, startTime: "18:00", durationMinutes: 90, status: "completed" },
  { itemId: 80004, courseItemId: 7001, sequence: 4, offsetDays: -49, startTime: "18:00", durationMinutes: 90, status: "completed" },
  { itemId: 80005, courseItemId: 7001, sequence: 5, offsetDays: -42, startTime: "18:00", durationMinutes: 90, status: "completed" },
  { itemId: 80006, courseItemId: 7001, sequence: 6, offsetDays: -35, startTime: "18:00", durationMinutes: 90, status: "completed" },
  // Course 7002 (finished, zoom) — all past.
  { itemId: 80007, courseItemId: 7002, sequence: 1, offsetDays: -40, startTime: "19:30", durationMinutes: 90, status: "completed" },
  { itemId: 80008, courseItemId: 7002, sequence: 2, offsetDays: -33, startTime: "19:30", durationMinutes: 90, status: "completed" },
  { itemId: 80009, courseItemId: 7002, sequence: 3, offsetDays: -26, startTime: "19:30", durationMinutes: 90, status: "completed" },
  { itemId: 80010, courseItemId: 7002, sequence: 4, offsetDays: -19, startTime: "19:30", durationMinutes: 90, status: "completed" },
  // Course 7004 (running, frontal) — past + upcoming + one cancelled.
  { itemId: 80011, courseItemId: 7004, sequence: 1, offsetDays: -14, startTime: "17:00", durationMinutes: 90, status: "completed" },
  { itemId: 80012, courseItemId: 7004, sequence: 2, offsetDays: -7, startTime: "17:00", durationMinutes: 90, status: "completed" },
  { itemId: 80013, courseItemId: 7004, sequence: 3, offsetDays: -3, startTime: "17:00", durationMinutes: 90, status: "completed" },
  { itemId: 80014, courseItemId: 7004, sequence: 4, offsetDays: -1, startTime: "17:00", durationMinutes: 90, status: "cancelled" },
  { itemId: 80015, courseItemId: 7004, sequence: 5, offsetDays: 1, startTime: "17:00", durationMinutes: 90, status: "scheduled" },
  { itemId: 80016, courseItemId: 7004, sequence: 6, offsetDays: 3, startTime: "17:00", durationMinutes: 90, status: "scheduled" },
  { itemId: 80017, courseItemId: 7004, sequence: 7, offsetDays: 7, startTime: "17:00", durationMinutes: 90, status: "scheduled" },
  { itemId: 80018, courseItemId: 7004, sequence: 8, offsetDays: 14, startTime: "17:00", durationMinutes: 90, status: "scheduled" },
  // Course 7101 (running, zoom, teacher 102).
  { itemId: 80019, courseItemId: 7101, sequence: 1, offsetDays: -14, startTime: "20:00", durationMinutes: 90, status: "completed" },
  { itemId: 80020, courseItemId: 7101, sequence: 2, offsetDays: -7, startTime: "20:00", durationMinutes: 90, status: "completed" },
  { itemId: 80021, courseItemId: 7101, sequence: 3, offsetDays: 2, startTime: "20:00", durationMinutes: 90, status: "scheduled" },
  { itemId: 80022, courseItemId: 7101, sequence: 4, offsetDays: 9, startTime: "20:00", durationMinutes: 90, status: "scheduled" },
  // Private lessons 9001 (teacher 101, נועם ישראלי).
  { itemId: 80023, courseItemId: 9001, sequence: 1, offsetDays: -10, startTime: "16:00", durationMinutes: 60, status: "completed" },
  { itemId: 80024, courseItemId: 9001, sequence: 2, offsetDays: -3, startTime: "16:00", durationMinutes: 60, status: "completed" },
  { itemId: 80025, courseItemId: 9001, sequence: 3, offsetDays: 4, startTime: "16:00", durationMinutes: 60, status: "scheduled" },
  { itemId: 80026, courseItemId: 9001, sequence: 4, offsetDays: 11, startTime: "16:00", durationMinutes: 60, status: "scheduled" },
  // Private lessons 9101 (teacher 102, איתי כהן).
  { itemId: 80027, courseItemId: 9101, sequence: 1, offsetDays: -5, startTime: "18:30", durationMinutes: 60, status: "completed" },
  { itemId: 80028, courseItemId: 9101, sequence: 2, offsetDays: 6, startTime: "18:30", durationMinutes: 60, status: "scheduled" },
];

const MOCK_MEETING_STATUS_LABELS: Record<PortalMeeting["status"], string> = {
  scheduled: "מתוכנן",
  completed: "התקיים",
  cancelled: "בוטל",
  unknown: "",
};

function buildMockMeeting(spec: MockMeetingSpec): PortalMeeting {
  const course = getMockPortalCourseById(spec.courseItemId);

  return {
    itemId: spec.itemId,
    name: `מפגש ${spec.sequence} — ${course?.name ?? "קורס"}`,
    courseItemId: spec.courseItemId,
    courseName: course?.name ?? null,
    teacherItemIds: course?.teacherItemIds ?? [],
    date: mockDateWithOffset(spec.offsetDays),
    startTime: spec.startTime,
    durationMinutes: spec.durationMinutes,
    status: spec.status,
    statusLabel: MOCK_MEETING_STATUS_LABELS[spec.status],
    location: course?.location ?? null,
    zoomLink: course?.zoomLink ?? null,
    attendanceSubmitted: spec.itemId === MOCK_ATTENDANCE_SUBMITTED_MEETING_ID,
  };
}

function getAllMockMeetings(): PortalMeeting[] {
  return MOCK_MEETING_SPECS.map(buildMockMeeting);
}

export function getMockMeetingsForTeacher(teacherItemId: number): PortalMeeting[] {
  return getAllMockMeetings().filter((meeting) => meeting.teacherItemIds.includes(teacherItemId));
}

export function getMockMeetingsForCourse(courseItemId: number): PortalMeeting[] {
  return getAllMockMeetings().filter((meeting) => meeting.courseItemId === courseItemId);
}

export function getMockMeetingById(meetingItemId: number): PortalMeeting | null {
  return getAllMockMeetings().find((meeting) => meeting.itemId === meetingItemId) ?? null;
}

// ---------------------------------------------------------------------------
// Meeting students + attendance.
// ---------------------------------------------------------------------------

const MOCK_STUDENTS_BY_COURSE: Record<number, string[]> = {
  7001: ["דניאל אברהם", "שירה לוי", "יוסף מזרחי", "תמר ביטון", "אורי שלום"],
  7002: ["מאיה פרץ", "עידו ברק", "נטע גולן", "אלון שמש"],
  7004: ["דניאל אברהם", "שירה לוי", "יוסף מזרחי", "תמר ביטון", "אורי שלום"],
  7101: ["רות אזולאי", "גיל עמר", "הילה דהן", "עומר קציר", "ליאת סבן", "נדב טל"],
};

export function getMockMeetingStudents(meetingItemId: number): MeetingStudent[] {
  const meeting = getMockMeetingById(meetingItemId);

  if (!meeting?.courseItemId) {
    return [];
  }

  const course = getMockPortalCourseById(meeting.courseItemId);

  if (course?.kind === "private_lessons" && course.studentName) {
    return [{ id: `s-${course.itemId}-1`, name: course.studentName }];
  }

  const names = MOCK_STUDENTS_BY_COURSE[meeting.courseItemId] ?? [];
  return names.map((name, index) => ({
    id: `s-${meeting.courseItemId}-${index + 1}`,
    name,
  }));
}

export function getMockAttendanceForMeeting(meetingItemId: number): AttendanceEntry[] | null {
  if (meetingItemId !== MOCK_ATTENDANCE_SUBMITTED_MEETING_ID) {
    return null;
  }

  const students = getMockMeetingStudents(meetingItemId);
  const statuses: AttendanceEntry["status"][] = ["present", "present", "late", "absent", "present"];

  return students.map((student, index) => ({
    studentId: student.id,
    studentName: student.name,
    status: statuses[index % statuses.length],
    note: statuses[index % statuses.length] === "absent" ? "הודיע מראש שלא יגיע" : undefined,
  }));
}

// ---------------------------------------------------------------------------
// Private course notebooks.
// ---------------------------------------------------------------------------

function buildMockNotebooks(): Record<number, PrivateCourseNotebook> {
  return {
    9001: {
      courseItemId: 9001,
      studentName: "נועם ישראלי",
      teacherName: "יעל כהן",
      learningGoals: "שיפור ערבית מדוברת לרמת שיחה",
      languageBackground: "למד ערבית ספרותית בתיכון, מבין אך מתקשה לדבר",
      generalNotes: "מעדיף תרגול שיחה על פני דקדוק. מתקדם יפה.",
      meetingSummaries: [
        {
          meetingItemId: 80023,
          date: mockDateWithOffset(-10),
          topicsCovered: "היכרות, משפחה ושיחת חולין בסיסית",
          newWordsPhrases: "כיף חאלכ, שו אחבארכ, עילה",
          homework: "להקליט דקה של הצגה עצמית בערבית",
          teacherNotes: "ביטחון נמוך בדיבור, אבל אוצר מילים טוב",
        },
        {
          meetingItemId: 80024,
          date: mockDateWithOffset(-3),
          topicsCovered: "קניות בשוק ומספרים",
          newWordsPhrases: "קדיש האדא, גאלי, רחיס",
          homework: "תרגול מספרים 1-100 בעל פה",
          teacherNotes: "שיפור ניכר בהגייה",
        },
      ],
      storedInMonday: false,
    },
    9002: {
      courseItemId: 9002,
      studentName: "רוני עזרא",
      teacherName: "יעל כהן",
      learningGoals: "הכנה לראיון עבודה בערבית",
      languageBackground: "דוברת ערבית בסיסית מהבית, קוראת לאט",
      generalNotes: "ממוקדת מאוד במטרה, צריך חומרים מעולם העבודה.",
      meetingSummaries: [
        {
          meetingItemId: 80901,
          date: mockDateWithOffset(-12),
          topicsCovered: "אוצר מילים מקצועי לראיונות",
          newWordsPhrases: "ח'ברה, וט'יפה, מקאבלה",
          homework: "לכתוב 5 משפטים על ניסיון תעסוקתי",
          teacherNotes: "מוטיבציה גבוהה, להמשיך בקצב הזה",
        },
        {
          meetingItemId: 80902,
          date: mockDateWithOffset(-5),
          topicsCovered: "סימולציית ראיון ראשונה",
          newWordsPhrases: "נקאט קוה, טמוח, אהדאף",
          homework: "לצפות בסרטון ראיון ולסכם",
          teacherNotes: "צריך חיזוק בזמני פועל",
        },
      ],
      storedInMonday: false,
    },
    9101: {
      courseItemId: 9101,
      studentName: "איתי כהן",
      teacherName: "אמיר לוי",
      learningGoals: "עברית יומיומית לעולה חדש",
      languageBackground: "עלה לפני שנה, רמת מתחיל מתקדם",
      generalNotes: "לומד מהר, זקוק לתרגול הקשבה.",
      meetingSummaries: [
        {
          meetingItemId: 80027,
          date: mockDateWithOffset(-5),
          topicsCovered: "קופת חולים ופנייה לרופא",
          newWordsPhrases: "תור, מרשם, התחייבות",
          homework: "לקבוע תור טלפונית ולספר על השיחה",
          teacherNotes: "מתקשה במספרים בדיבור מהיר",
        },
      ],
      storedInMonday: false,
    },
  };
}

export function getMockPrivateNotebook(courseItemId: number): PrivateCourseNotebook | null {
  return buildMockNotebooks()[courseItemId] ?? null;
}
