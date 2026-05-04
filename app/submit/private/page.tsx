"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { FormPageShell } from "@/components/form-page-shell";
import { LoadingSpinner } from "@/components/loading-spinner";
import { SearchSelect } from "@/components/search-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSessionGuard } from "@/hooks/use-session-guard";
import type { PaymentRequestPayload, PrivateLesson } from "@/lib/monday/types";
import { saveSubmissionSummary } from "@/lib/session";

function displayNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "לא הוגדר" : String(value);
}

export default function PrivateLessonsSubmitPage() {
  const router = useRouter();
  const { session, isReady } = useSessionGuard();
  const currentSession = session;
  const [lessons, setLessons] = useState<PrivateLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [privateLessonId, setPrivateLessonId] = useState("");
  const [lessonsCount, setLessonsCount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentSession) {
      return;
    }

    const teacherId = currentSession.teacherId;
    const previewQuery = currentSession.previewMode ? "&preview=1" : "";
    let ignore = false;

    async function loadLessons() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/monday/private-lessons?teacherId=${teacherId}${previewQuery}`);
        if (!response.ok) {
          throw new Error("לא הצלחנו לטעון את רשימת השיעורים הפרטיים.");
        }

        const data = (await response.json()) as PrivateLesson[];
        if (!ignore) {
          setLessons(data);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(
            requestError instanceof Error ? requestError.message : "שגיאה בטעינת שיעורים פרטיים.",
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadLessons();

    return () => {
      ignore = true;
    };
  }, [currentSession]);

  if (!isReady || !currentSession) {
    return null;
  }

  const selectedLesson = lessons.find((lesson) => lesson.id === Number(privateLessonId)) || null;
  const requestedLessonsNumber = Number(lessonsCount);

  async function handleSubmit() {
    if (!currentSession) {
      return;
    }

    if (!selectedLesson || !lessonsCount || requestedLessonsNumber <= 0) {
      setSubmitError("יש לבחור תלמיד ולמלא מספר שיעורים לתשלום.");
      return;
    }

    const sessionData = currentSession;
    setSubmitting(true);
    setSubmitError(null);

    const payload: PaymentRequestPayload = {
      submitterId: sessionData.teacherId,
      supplierId: sessionData.supplierId,
      teacherName: sessionData.teacherName,
      previewMode: sessionData.previewMode,
      paymentType: "private_lessons",
      privateLessonId: selectedLesson.id,
      lessonsCount: requestedLessonsNumber,
      requestedMeetings: requestedLessonsNumber,
      courseClaimType: "private_lessons",
      requiresManualReview: true,
      manualReviewState: "needs_review",
      reviewReason: "שיעורים פרטיים נשלחים לבדיקה פנימית אם חסרים נתוני חישוב אמינים",
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
        paymentTypeLabel: "שיעורים פרטיים",
        subject: selectedLesson.studentName,
        unitLabel: "שיעורים",
        requestedUnits: requestedLessonsNumber,
        requiresManualReview: true,
        reviewReason: "הדרישה תיבדק מול נתוני השיעורים הפרטיים.",
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
      title="דרישת תשלום עבור שיעורים פרטיים"
      description={<p>יש לבחור את התלמיד מהרשימה ולציין כמה שיעורים התקיימו ומוגשים לתשלום.</p>}
    >
      <div className="space-y-2">
        <Label>בחירת תלמיד</Label>
        {loading ? (
          <LoadingSpinner label="טוען את רשימת התלמידים..." />
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        ) : (
          <SearchSelect
            options={lessons.map((lesson) => ({
              value: String(lesson.id),
              label: lesson.studentName,
              description: [
                `נרכשו: ${displayNumber(lesson.lessonsPurchased)}`,
                `התקיימו: ${displayNumber(lesson.lessonsHeld)}`,
                `נותרו: ${displayNumber(lesson.lessonsRemaining)}`,
              ].join(" | "),
            }))}
            value={privateLessonId}
            onValueChange={setPrivateLessonId}
            placeholder="בחר תלמיד"
            searchPlaceholder="חיפוש תלמיד..."
            emptyText="לא נמצאו תלמידים מתאימים"
          />
        )}
      </div>

      {selectedLesson ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-slate-800">
          <h2 className="mb-3 text-base font-semibold text-slate-950">מצב שיעורים</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-white px-3 py-3">
              <div className="text-xs text-slate-500">שיעורים שנרכשו</div>
              <div className="mt-1 text-lg font-semibold">{displayNumber(selectedLesson.lessonsPurchased)}</div>
            </div>
            <div className="rounded-lg bg-white px-3 py-3">
              <div className="text-xs text-slate-500">שיעורים שהתקיימו</div>
              <div className="mt-1 text-lg font-semibold">{displayNumber(selectedLesson.lessonsHeld)}</div>
            </div>
            <div className="rounded-lg bg-white px-3 py-3">
              <div className="text-xs text-slate-500">שיעורים נותרים</div>
              <div className="mt-1 text-lg font-semibold">{displayNumber(selectedLesson.lessonsRemaining)}</div>
            </div>
          </div>
          <p className="mt-3 rounded-lg bg-white px-3 py-2">
            שיעורים שכבר הוגשו בדרישות פעילות: יוצג כאשר יחובר שדה מפגשים חדש בבורד הדרישות.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="lessonsCount">מספר שיעורים לתשלום</Label>
        <Input
          id="lessonsCount"
          type="number"
          min={1}
          max={selectedLesson?.lessonsPurchased || undefined}
          placeholder="מספר שיעורים"
          value={lessonsCount}
          onChange={(event) => setLessonsCount(event.target.value)}
          disabled={!selectedLesson}
        />
      </div>

      {selectedLesson && requestedLessonsNumber > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          <h2 className="mb-3 text-base font-semibold">סיכום דרישה</h2>
          <div className="space-y-1">
            <p>מגיש/ה: {currentSession.teacherName}</p>
            <p>סוג דרישה: שיעורים פרטיים</p>
            <p>תלמיד/ה: {selectedLesson.studentName}</p>
            <p>שיעורים בדרישה הנוכחית: {requestedLessonsNumber}</p>
            <p className="font-semibold">סטטוס: תישלח לבדיקה פנימית</p>
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
        <Button onClick={() => void handleSubmit()} disabled={submitting || loading}>
          {submitting ? "שולח..." : "שליחת הדרישה"}
        </Button>
      </div>
    </FormPageShell>
  );
}
