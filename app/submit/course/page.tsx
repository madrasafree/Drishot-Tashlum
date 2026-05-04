"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { FormPageShell } from "@/components/form-page-shell";
import { LoadingSpinner } from "@/components/loading-spinner";
import { SearchSelect } from "@/components/search-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSessionGuard } from "@/hooks/use-session-guard";
import type {
  Course,
  CourseMeetingsState,
  ManualReviewState,
  PaymentRequestPayload,
} from "@/lib/monday/types";
import { validateMeetingsSubmission } from "@/lib/payment/meetings";
import { saveSubmissionSummary } from "@/lib/session";
import { formatShortDate } from "@/lib/utils";

function displayNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "לא הוגדר" : String(value);
}

function getManualReviewState(reason: string | null): ManualReviewState {
  if (!reason) {
    return "ok";
  }

  if (reason.includes("דרישה ישנה")) {
    return "legacy_without_meetings";
  }

  if (reason.includes("מתוך")) {
    return "meetings_over_limit";
  }

  return "needs_review";
}

export default function CourseSubmitPage() {
  const router = useRouter();
  const { session, isReady } = useSessionGuard();
  const currentSession = session;
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseId, setCourseId] = useState("");
  const [meetingsState, setMeetingsState] = useState<CourseMeetingsState | null>(null);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [meetingsError, setMeetingsError] = useState<string | null>(null);
  const [requestedMeetings, setRequestedMeetings] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedCourse = courses.find((course) => course.id === Number(courseId)) || null;
  const requestedMeetingsNumber = Number(requestedMeetings);
  const validation = useMemo(() => {
    if (!meetingsState || !Number.isFinite(requestedMeetingsNumber)) {
      return null;
    }

    return validateMeetingsSubmission({
      totalMeetings: meetingsState.totalMeetings,
      alreadySubmittedMeetings: meetingsState.submittedMeetingsTotal,
      requestedMeetings: requestedMeetingsNumber,
      hasLegacyClaimsWithoutMeetings: meetingsState.hasLegacyClaimsWithoutMeetings,
    });
  }, [meetingsState, requestedMeetingsNumber]);

  useEffect(() => {
    if (!currentSession) {
      return;
    }

    const teacherId = currentSession.teacherId;
    let ignore = false;

    async function loadCourses() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/monday/courses?teacherId=${teacherId}&routeKey=course`);
        if (!response.ok) {
          throw new Error("לא הצלחנו לטעון את רשימת הקורסים.");
        }

        const data = (await response.json()) as Course[];
        if (!ignore) {
          setCourses(data);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError instanceof Error ? requestError.message : "שגיאה בטעינת קורסים.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadCourses();

    return () => {
      ignore = true;
    };
  }, [currentSession]);

  useEffect(() => {
    setRequestedMeetings("");
    setSubmitError(null);
    setMeetingsState(null);
    setMeetingsError(null);

    if (!courseId) {
      return;
    }

    let ignore = false;

    async function loadMeetingsState() {
      setMeetingsLoading(true);

      try {
        const response = await fetch(`/api/monday/course-meetings?courseId=${courseId}`);
        if (!response.ok) {
          throw new Error("לא הצלחנו לטעון את מצב המפגשים בקורס.");
        }

        const data = (await response.json()) as CourseMeetingsState;
        if (!ignore) {
          setMeetingsState(data);
        }
      } catch (requestError) {
        if (!ignore) {
          setMeetingsError(
            requestError instanceof Error ? requestError.message : "שגיאה בטעינת מצב המפגשים.",
          );
        }
      } finally {
        if (!ignore) {
          setMeetingsLoading(false);
        }
      }
    }

    void loadMeetingsState();

    return () => {
      ignore = true;
    };
  }, [courseId]);

  if (!isReady || !currentSession) {
    return null;
  }

  async function handleSubmit() {
    if (!currentSession) {
      return;
    }

    if (!selectedCourse || !meetingsState || !requestedMeetings || requestedMeetingsNumber <= 0) {
      setSubmitError("יש לבחור קורס ולמלא מספר מפגשים להגשה.");
      return;
    }

    const currentValidation =
      validation ??
      validateMeetingsSubmission({
        totalMeetings: meetingsState.totalMeetings,
        alreadySubmittedMeetings: meetingsState.submittedMeetingsTotal,
        requestedMeetings: requestedMeetingsNumber,
        hasLegacyClaimsWithoutMeetings: meetingsState.hasLegacyClaimsWithoutMeetings,
      });

    const sessionData = currentSession;
    setSubmitting(true);
    setSubmitError(null);

    const payload: PaymentRequestPayload = {
      submitterId: sessionData.teacherId,
      supplierId: sessionData.supplierId,
      teacherName: sessionData.teacherName,
      paymentType: "course",
      courseId: selectedCourse.id,
      requestedMeetings: requestedMeetingsNumber,
      totalMeetingsSnapshot: meetingsState.totalMeetings,
      courseClaimType:
        meetingsState.totalMeetings !== null && requestedMeetingsNumber >= meetingsState.totalMeetings
          ? "full_course"
          : "partial_course",
      requiresManualReview: currentValidation.requiresManualReview,
      manualReviewState: getManualReviewState(currentValidation.reviewReason),
      reviewReason: currentValidation.reviewReason,
    };

    try {
      const response = await fetch("/api/monday/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = (await response.json()) as { error?: string };
        throw new Error(errorPayload.error || "אירעה שגיאה בשליחת הדרישה. נסה שוב או פנה למשרד.");
      }

      saveSubmissionSummary({
        paymentTypeLabel: "קורס",
        subject: selectedCourse.name,
        unitLabel: "מפגשים",
        requestedUnits: requestedMeetingsNumber,
        requiresManualReview: currentValidation.requiresManualReview,
        reviewReason: currentValidation.reviewReason,
      });
      router.push("/success");
    } catch (requestError) {
      setSubmitError(
        requestError instanceof Error
          ? requestError.message
          : "אירעה שגיאה בשליחת הדרישה. נסה שוב או פנה למשרד.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormPageShell
      title="דרישת תשלום עבור קורס"
      description={
        <>
          <p>עבור כל קורס יש למלא דרישה נפרדת.</p>
          <p>
            במסלול קורס ניתן להגיש רק קורסים שהסתיימו. המערכת מציגה את מצב המפגשים בקורס בלי להציג
            תעריפים או סכומים.
          </p>
        </>
      }
    >
      <div className="space-y-2">
        <Label>עבור איזה קורס</Label>
        {loading ? (
          <LoadingSpinner label="טוען את רשימת הקורסים..." />
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        ) : (
          <SearchSelect
            options={courses.map((course) => ({
              value: String(course.id),
              label: course.name,
              description: [
                `התחלה: ${formatShortDate(course.startDate)}`,
                `סיום: ${formatShortDate(course.endDate)}`,
                `מפגשים: ${displayNumber(course.lessonsCount)}`,
                `סטטוס: ${course.state}`,
              ].join(" | "),
            }))}
            value={courseId}
            onValueChange={setCourseId}
            placeholder="בחר קורס שהסתיים"
            searchPlaceholder="חיפוש קורס..."
            emptyText="לא נמצאו קורסים שהסתיימו"
          />
        )}
      </div>

      {meetingsLoading ? <LoadingSpinner label="טוען את מצב המפגשים בקורס..." /> : null}

      {meetingsError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {meetingsError}
        </div>
      ) : null}

      {meetingsState ? (
        <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-950">מצב מפגשים בקורס</h2>
            <p className="mt-1">קורס: {meetingsState.courseName}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-white px-3 py-3">
              <div className="text-xs text-slate-500">מספר מפגשים בקורס</div>
              <div className="mt-1 text-lg font-semibold">{displayNumber(meetingsState.totalMeetings)}</div>
            </div>
            <div className="rounded-lg bg-white px-3 py-3">
              <div className="text-xs text-slate-500">כבר הוגשו בדרישות פעילות</div>
              <div className="mt-1 text-lg font-semibold">{meetingsState.submittedMeetingsTotal}</div>
            </div>
            <div className="rounded-lg bg-white px-3 py-3">
              <div className="text-xs text-slate-500">יתרה זמינה להגשה</div>
              <div className="mt-1 text-lg font-semibold">{displayNumber(meetingsState.remainingMeetings)}</div>
            </div>
          </div>
          <div>
            <div className="font-medium">דרישות קיימות</div>
            {meetingsState.existingClaims.length ? (
              <ul className="mt-2 space-y-2">
                {meetingsState.existingClaims.map((claim) => (
                  <li key={claim.itemId} className="rounded-lg bg-white px-3 py-2">
                    {claim.teacherName} |{" "}
                    {claim.meetingsCount === null ? "ללא נתוני מפגשים" : `${claim.meetingsCount} מפגשים`} |{" "}
                    {claim.statusLabel || "ללא סטטוס"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 rounded-lg bg-white px-3 py-2">לא נמצאו דרישות פעילות על הקורס.</p>
            )}
          </div>
          {meetingsState.warnings.length ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
              {meetingsState.warnings.join(" ")} אפשר להגיש דרישה, אך היא תעבור לבדיקה ידנית.
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="requestedMeetings">כמה מפגשים ברצונך להגיש?</Label>
        <Input
          id="requestedMeetings"
          type="number"
          min={1}
          placeholder="מספר מפגשים"
          value={requestedMeetings}
          onChange={(event) => setRequestedMeetings(event.target.value)}
          disabled={!meetingsState}
        />
      </div>

      {validation && requestedMeetingsNumber > 0 && meetingsState ? (
        <div
          className={
            validation.requiresManualReview
              ? "rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950"
              : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950"
          }
        >
          <h2 className="mb-3 text-base font-semibold">סיכום דרישה</h2>
          <div className="space-y-1">
            <p>מגיש/ה: {currentSession.teacherName}</p>
            <p>סוג דרישה: קורס</p>
            <p>קורס: {selectedCourse?.name}</p>
            <p>מספר מפגשים בקורס: {displayNumber(meetingsState.totalMeetings)}</p>
            <p>מפגשים שכבר הוגשו: {meetingsState.submittedMeetingsTotal}</p>
            <p>מפגשים בדרישה הנוכחית: {requestedMeetingsNumber}</p>
            <p>
              סה&quot;כ לאחר ההגשה: {validation.totalAfterSubmission} מתוך{" "}
              {displayNumber(meetingsState.totalMeetings)}
            </p>
            <p className="font-semibold">
              סטטוס: {validation.requiresManualReview ? "נדרשת בדיקה ידנית" : "תקין להגשה"}
            </p>
            {validation.reviewReason ? <p>{validation.reviewReason}</p> : null}
          </div>
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{submitError}</div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={() => router.push("/")}>
          חזרה
        </Button>
        <Button onClick={() => void handleSubmit()} disabled={submitting || loading || meetingsLoading}>
          {submitting
            ? "שולח..."
            : validation?.requiresManualReview
              ? "שליחה לבדיקה"
              : "שליחת הדרישה"}
        </Button>
      </div>
    </FormPageShell>
  );
}
