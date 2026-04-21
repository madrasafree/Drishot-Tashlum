export interface Teacher {
  id: number;
  name: string;
  email: string;
  supplierRelationId: number | null;
  supplierFileStatus: string;
  coursesRelationIds: number[];
  privateLessonsRelationIds: number[];
}

export interface TeacherSimple {
  id: number;
  name: string;
}

export interface Supplier {
  id: number;
  name: string;
  fileStatus: string;
  taxValidityDate: string | null;
  email: string;
  idNumber: string;
  employmentStatus: string;
}

export interface Course {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  teachingRate: number | null;
  travelRate: number | null;
  state: string;
}

export interface PrivateLesson {
  id: number;
  studentName: string;
  lessonsPurchased: number;
  lessonsHeld: number;
  lessonsRemaining: number;
  status: string;
}

export interface ExistingPaymentRequest {
  id: number;
  name: string;
  status: string;
  submitDate: string | null;
}

export interface DuplicatePaymentRequestResult {
  isDuplicate: boolean;
  existingItem?: ExistingPaymentRequest;
}

export interface Replacement {
  id: number;
  replacingTeacherName: string;
  replacementDate: string;
  teachingAmount: number;
  travelAmount: number;
  totalAmount: number;
}

export interface ReplacementLookupResult {
  replacements: Replacement[];
  totalSuggestedDeduction: number;
}

export type PaymentType = "course" | "replacement" | "other" | "private_lessons";

export interface PaymentRequestInput {
  submitterId: number;
  supplierId: number;
  paymentType: PaymentType;
  courseId?: number;
  teachingAmount?: number;
  travelAmount?: number;
  replacedTeacherId?: number;
  replacementDate?: string;
  details?: string;
  amount?: number;
  privateLessonId?: number;
  lessonsCount?: number;
  totalTransfer?: number;
}

export interface SupplierCheckResult {
  blocked: boolean;
  reason: string | null;
  teacherSupplierStatus: string;
  supplierFileStatus: string | null;
  taxValidityDate: string | null;
  supplierId: number | null;
}

export interface PaymentRequestPayload extends PaymentRequestInput {
  teacherName: string;
  deductionSummary?: {
    applied: boolean;
    replacements: Replacement[];
    totalTeachingDeduction: number;
    totalTravelDeduction: number;
    totalSuggestedDeduction: number;
  } | null;
}
