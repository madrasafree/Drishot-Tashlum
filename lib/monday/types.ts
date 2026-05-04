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
  lessonsCount: number | null;
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

export type PaymentRouteKey = "course" | "replacement" | "private" | "other";

export type CourseClaimType =
  | "full_course"
  | "partial_course"
  | "replacement"
  | "correction"
  | "private_lessons"
  | "other";

export type ManualReviewState =
  | "ok"
  | "needs_review"
  | "legacy_without_meetings"
  | "meetings_over_limit";

export interface PaymentRouteConfig {
  routeKey: PaymentRouteKey;
  label: string;
  sourceBoardId?: number;
  allowedCourseStatuses?: string[];
  unitLabel: "מפגשים" | "שיעורים" | "יחידות";
  requiresCourse: boolean;
  requiresReplacedTeacher?: boolean;
  requiresManualDescription?: boolean;
  calculationMode: "course_meetings" | "private_lessons" | "manual";
}

export interface CourseMeetingClaim {
  itemId: number;
  teacherId: number | null;
  teacherName: string;
  requestType: string;
  meetingsCount: number | null;
  statusLabel: string;
  isLegacyWithoutMeetings: boolean;
}

export interface CourseMeetingsState {
  courseId: number;
  courseName: string;
  totalMeetings: number | null;
  existingClaims: CourseMeetingClaim[];
  submittedMeetingsTotal: number;
  remainingMeetings: number | null;
  hasLegacyClaimsWithoutMeetings: boolean;
  warnings: string[];
}

export interface MeetingsSubmissionInput {
  totalMeetings: number | null | undefined;
  alreadySubmittedMeetings: number;
  requestedMeetings: number;
  hasLegacyClaimsWithoutMeetings: boolean;
}

export interface MeetingsSubmissionValidation {
  isValid: boolean;
  requiresManualReview: boolean;
  reviewReason: string | null;
  totalAfterSubmission: number;
}

export interface InternalAmountInput {
  courseTeachingRate: number | null | undefined;
  courseTravelRate: number | null | undefined;
  totalMeetings: number | null | undefined;
  requestedMeetings: number;
}

export interface InternalAmountResult {
  teachingAmount: number;
  travelAmount: number;
}

export interface PaymentRequestInput {
  submitterId: number;
  supplierId: number;
  paymentType: PaymentType;
  courseId?: number;
  requestedMeetings?: number;
  totalMeetingsSnapshot?: number | null;
  courseClaimType?: CourseClaimType;
  requiresManualReview?: boolean;
  manualReviewState?: ManualReviewState;
  reviewReason?: string | null;
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
  previewMode?: boolean;
  deductionSummary?: {
    applied: boolean;
    replacements: Replacement[];
    totalTeachingDeduction: number;
    totalTravelDeduction: number;
    totalSuggestedDeduction: number;
  } | null;
}
