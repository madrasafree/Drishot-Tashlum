const {
  calculateInternalAmountsForCourseClaim,
  validateMeetingsSubmission,
} = await import("../lib/payment/meetings.ts");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  !validateMeetingsSubmission({
    requestedMeetings: 0,
    alreadySubmittedMeetings: 0,
    totalMeetings: 12,
    hasLegacyClaimsWithoutMeetings: false,
  }).isValid,
  "0 requested meetings should be invalid",
);

assert(
  !validateMeetingsSubmission({
    requestedMeetings: 6,
    alreadySubmittedMeetings: 6,
    totalMeetings: 12,
    hasLegacyClaimsWithoutMeetings: false,
  }).requiresManualReview,
  "6 requested + 6 already out of 12 should be valid",
);

assert(
  validateMeetingsSubmission({
    requestedMeetings: 7,
    alreadySubmittedMeetings: 6,
    totalMeetings: 12,
    hasLegacyClaimsWithoutMeetings: false,
  }).requiresManualReview,
  "7 requested + 6 already out of 12 should require manual review",
);

assert(
  validateMeetingsSubmission({
    requestedMeetings: 1,
    alreadySubmittedMeetings: 0,
    totalMeetings: null,
    hasLegacyClaimsWithoutMeetings: false,
  }).requiresManualReview,
  "missing total meetings should require manual review",
);

assert(
  validateMeetingsSubmission({
    requestedMeetings: 1,
    alreadySubmittedMeetings: 0,
    totalMeetings: 12,
    hasLegacyClaimsWithoutMeetings: true,
  }).requiresManualReview,
  "legacy claims should require manual review",
);

assert(
  validateMeetingsSubmission({
    requestedMeetings: 1,
    alreadySubmittedMeetings: 12,
    totalMeetings: 12,
    hasLegacyClaimsWithoutMeetings: false,
  }).requiresManualReview,
  "12 already + 1 requested out of 12 should require manual review",
);

const halfCourse = calculateInternalAmountsForCourseClaim({
  courseTeachingRate: 3000,
  courseTravelRate: 300,
  totalMeetings: 12,
  requestedMeetings: 6,
});

assert(halfCourse.teachingAmount === 1500, "half course teaching amount should be 1500");
assert(halfCourse.travelAmount === 150, "half course travel amount should be 150");

const noTravel = calculateInternalAmountsForCourseClaim({
  courseTeachingRate: 3000,
  courseTravelRate: null,
  totalMeetings: 12,
  requestedMeetings: 6,
});

assert(noTravel.travelAmount === 0, "missing travel rate should calculate as 0");

let threw = false;
try {
  calculateInternalAmountsForCourseClaim({
    courseTeachingRate: 3000,
    courseTravelRate: 300,
    totalMeetings: 0,
    requestedMeetings: 6,
  });
} catch {
  threw = true;
}

assert(threw, "totalMeetings 0 should throw");

console.log("Meetings business tests passed");
