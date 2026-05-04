import type {
  InternalAmountInput,
  InternalAmountResult,
  MeetingsSubmissionInput,
  MeetingsSubmissionValidation,
} from "@/lib/monday/types";

function isPositiveNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function roundToCurrency(value: number) {
  return Math.round(value);
}

export function validateMeetingsSubmission(
  input: MeetingsSubmissionInput,
): MeetingsSubmissionValidation {
  const totalAfterSubmission = input.alreadySubmittedMeetings + input.requestedMeetings;

  if (!isPositiveNumber(input.requestedMeetings)) {
    return {
      isValid: false,
      requiresManualReview: true,
      reviewReason: "מספר המפגשים בדרישה חייב להיות גדול מ-0",
      totalAfterSubmission,
    };
  }

  if (!isPositiveNumber(input.totalMeetings)) {
    return {
      isValid: true,
      requiresManualReview: true,
      reviewReason: "חסר מספר מפגשים בקורס",
      totalAfterSubmission,
    };
  }

  if (input.hasLegacyClaimsWithoutMeetings) {
    return {
      isValid: true,
      requiresManualReview: true,
      reviewReason: "קיימת דרישה ישנה על הקורס ללא מספר מפגשים",
      totalAfterSubmission,
    };
  }

  if (totalAfterSubmission > input.totalMeetings) {
    return {
      isValid: true,
      requiresManualReview: true,
      reviewReason: `סה"כ מפגשים לאחר ההגשה: ${totalAfterSubmission} מתוך ${input.totalMeetings}`,
      totalAfterSubmission,
    };
  }

  return {
    isValid: true,
    requiresManualReview: false,
    reviewReason: null,
    totalAfterSubmission,
  };
}

export function calculateInternalAmountsForCourseClaim(
  input: InternalAmountInput,
): InternalAmountResult {
  if (!isPositiveNumber(input.totalMeetings)) {
    throw new Error("Cannot calculate amounts without total course meetings.");
  }

  if (!isPositiveNumber(input.courseTeachingRate)) {
    throw new Error("Cannot calculate teaching amount without course teaching rate.");
  }

  if (!isPositiveNumber(input.requestedMeetings)) {
    throw new Error("Cannot calculate amounts without requested meetings.");
  }

  return {
    teachingAmount: roundToCurrency((input.courseTeachingRate / input.totalMeetings) * input.requestedMeetings),
    travelAmount: input.courseTravelRate
      ? roundToCurrency((input.courseTravelRate / input.totalMeetings) * input.requestedMeetings)
      : 0,
  };
}
