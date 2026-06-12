// Preview/mock data for the Teacher Portal.
// Active whenever Monday preview mode is on (no MONDAY_API_TOKEN) so every
// portal screen works locally without real credentials.
//
// The base mock identities below are owned by the auth foundation; service
// workstreams extend this file with courses/meetings/attendance/notebook
// mocks without changing existing exports.

import type { PortalTeacher } from "@/lib/monday/portal-types";

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
