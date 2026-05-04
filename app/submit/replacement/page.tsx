"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { FormPageShell } from "@/components/form-page-shell";
import { LoadingSpinner } from "@/components/loading-spinner";
import { SearchSelect } from "@/components/search-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSessionGuard } from "@/hooks/use-session-guard";
import type {
  Course,
  CourseMeetingsState,
  ManualReviewState,
  PaymentRequestPayload,
  Teacher,
} from "@/lib/monday/types";
import { validateMeetingsSubmission } from "@/lib/payment/meetings";
import { saveSubmissionSummary } from "@/lib/session";
import { formatShortDate } from "@/lib/utils";

function toDisplayDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

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

export default function ReplacementSubmitPage() {
  const router = useRouter();
  const { session, isReady } = useSessionGuard();
  const currentSession = session;
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [teachersError, setTeachersError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [replacedTeacherId, setReplacedTeacherId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [replacementDate, setReplacementDate] = useState("");
  const [requestedMeetings, setRequestedMeetings] = useState("");
  const [details, setDetails] = useState("");
  const [meetingsState, setMeetingsState] = useState<CourseMeetingsState | null>(null);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [meetingsError, setMeetingsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedTeacher = teachers.find((teacher) => teacher.id === Number(replacedTeacherId)) || null;
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

    const previewQuery = currentSession.previewMode ? "?preview=1" : "";
    let ignore = false;

    async function loadTeachers() {
      setTeachersLoading(true);
      setTeachersError(null);

      try {
        const response = await fetch(`/api/monday/teachers${previewQuery}`);
        if (!response.ok) {
          throw new Error("לא הצלחנו לטעון את רשימת המורים.");
        }

        const data = (await response.json()) as Teacher[];
        if (!ignore) {
          setTeachers(data);
        }
      } catch (requestError) {
        if (!ignore) {
          setTeachersError(requestError instanceof Error ? requestError.message : "שגיאה בטעינת מורים.");
        }
      } finally {
        if (!ignore) {
          setTeachersLoading(false);
        }
      }
    }

    void loadTeachers();

    return () => {
      ignore = true;
    };
  }, [currentSession]);

  useEffect(() => {
    setCourseId("");
    setCourses([]);
    setMeetingsState(null);
    setRequestedMeetings("");
    setSubmitError(null);

    if (!replacedTeacherId) {
      return;
    }

    const previewQuery = currentSession?.previewMode ? "&preview=1" : "";
    let ignore = false;

    async function loadCourses() {
      setCoursesLoading(true);
      setCoursesError(null);

      try {
        const response = await fetch(
          `/api/monday/courses?teacherId=${replacedTeacherId}&routeKey=replacement${previewQuery}`,
        );
        if (!response.ok) {
          throw new Error("לא הצלחנו לטעון את קורסי המורה שהוחלף.");
        }

        const data = (await response.json()) as Course[];
        if (!ignore) {
          setCourses(data);
        }
      } catch (requestError) {
        if (!ignore) {
          setCoursesError(requestError instanceof Error ? requestError.message : "שגיאה בטעינת קורסים.");
        }
      } finally {
        if (!ignore) {
          setCoursesLoading(false);
        }
      }
    }

    void loadCourses();

    return () => {
      ignore = true;
    };
  }, [replacedTeacherId, currentSession?.previewMode]);

  useEffect(() => {
    setRequestedMeetings("");
    setSubmitError(null);
    setMeetingsState(null);
    setMeetingsError(null);

    if (!courseId) {
      return;
    }

    const previewQuery = currentSession?.previewMode ? "&preview=1" : "";
    let ignore = false;

    async function loadMeetingsState() {
      setMeetingsLoading(true);

      try {
        const response = await fetch(`/api/monday/course-meetings?courseId=${courseId}${previewQuery}`);
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
  }, [courseId, currentSession?.previewMode]);

  if (!isReady || !currentSession) {
    return null;
  }

  async function handleSubmit() {
    if (!currentSession) {
      return;
    }

    if (
      !selectedTeacher ||
      !selectedCourse ||
      !meetingsState ||
      !replacementDate ||
      !requestedMeetings ||
      requestedMeetingsNumber <= 0
    ) {
      setSubmitError("יש למלא את כל שדות החובה לפני השליחה.");
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

    const reviewReason = [currentValidation.reviewReason, details.trim() ? `פירוט: ${details.trim()}` : null]
      .filter(Boolean)
      .join(" | ");

    const payload: PaymentRequestPayload = {
      submitterId: sessionData.teacherId,
      supplierId: sessionData.supplierId,
      teacherName: sessionData.teacherName,
      previewMode: sessionData.previewMode,
      paymentType: "replacement",
      replacedTeacherId: selectedTeacher.id,
      courseId: selectedCourse.id,
      replacementDate: toDisplayDate(replacementDate),
      requestedMeetings: requestedMeetingsNumber,
      totalMeetingsSnapshot: meetingsState.totalMeetings,
      courseClaimType: "replacement",
      requiresManualReview: currentValidation.requiresManualReview,
      manualReviewState: getManualReviewState(currentValidation.reviewReason),
      reviewReason: reviewReason || currentValidation.reviewReason,
      details: details.trim() || undefined,
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
        paymentTypeLabel: "החלפה",
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
      title="דרישת תשלום עבור החלפת מורה"
      description={
        <>
          <p>תודה שנרתמת לעזור בהחלפת מורה. במסלול הזה מזינים רק את פרטי ההחלפה ומספר המפגשים.</p>
          <p>המערכת בודקת את מצב המפגשים בקורס ושולחת לבדיקה ידנית אם נדרשת השלמה או קיזוז.</p>
        </>
      }
    >
      <div className="space-y-2">
        <Label>את מי החלפתי</Label>
        {teachersLoading ? (
          <LoadingSpinner label="טוען מורים..." />
        ) : teachersError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {teachersError}
          </div>
        ) : (
          <SearchSelect
            options={teachers.map((teacher) => ({
              value: String(teacher.id),
              label: teacher.name,
            }))}
            value={replacedTeacherId}
            onValueChange={setReplacedTeacherId}
            placeholder="בחר מורה"
            searchPlaceholder="חיפוש מורה..."
            emptyText="לא נמצאו מורים מתאימים"
          />
        )}
      </div>

      <div className="space-y-2">
        <Label>עבור איזה קורס</Label>
        {coursesLoading ? (
          <LoadingSpinner label="טוען את קורסי המורה שהוחלף..." />
        ) : coursesError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {coursesError}
          </div>
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
            placeholder="בחר קורס"
            searchPlaceholder="חיפוש קורס..."
            emptyText="לא נמצאו קורסים רצים או שהסתיימו"
            disabled={!replacedTeacherId}
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
          <h2 className="text-base font-semibold text-slate-950">מצב מפגשים בקורס</h2>
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
          {meetingsState.existingClaims.length ? (
            <ul className="space-y-2">
              {meetingsState.existingClaims.map((claim) => (
                <li key={claim.itemId} className="rounded-lg bg-white px-3 py-2">
                  {claim.teacherName} |{" "}
                  {claim.meetingsCount === null ? "ללא נתוני מפגשים" : `${claim.meetingsCount} מפגשים`} |{" "}
                  {claim.statusLabel || "ללא סטטוס"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg bg-white px-3 py-2">לא נמצאו דרישות פעילות על הקורס.</p>
          )}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="replacementDate">מתי החלפתי</Label>
          <Input
            id="replacementDate"
            type="date"
            value={replacementDate}
            onChange={(event) => setReplacementDate(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="requestedMeetings">כמה מפגשים החלפתי</Label>
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="details">פירוט קצר אם צריך</Label>
        <Textarea id="details" rows={3} value={details} onChange={(event) => setDetails(event.target.value)} />
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
            <p>סוג דרישה: החלפה</p>
            <p>את מי החלפתי: {selectedTeacher?.name}</p>
            <p>קורס: {selectedCourse?.name}</p>
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
        <Button onClick={() => void handleSubmit()} disabled={submitting || teachersLoading || coursesLoading || meetingsLoading}>
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
