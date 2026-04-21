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

export default function PrivateLessonsSubmitPage() {
  const router = useRouter();
  const { session, isReady } = useSessionGuard();
  const currentSession = session;
  const [lessons, setLessons] = useState<PrivateLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [privateLessonId, setPrivateLessonId] = useState("");
  const [lessonsCount, setLessonsCount] = useState("");
  const [totalTransfer, setTotalTransfer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentSession) {
      return;
    }

    let ignore = false;

    async function loadLessons() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/monday/private-lessons?teacherId=${currentSession.teacherId}`);
        if (!response.ok) {
          throw new Error("לא הצלחנו לטעון את רשימת השיעורים הפרטיים.");
        }

        const data = (await response.json()) as PrivateLesson[];
        if (!ignore) {
          setLessons(data);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError instanceof Error ? requestError.message : "שגיאה בטעינת שיעורים פרטיים.");
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

  const selectedLesson = lessons.find((lesson) => lesson.id === Number(privateLessonId));

  async function handleSubmit() {
    if (!privateLessonId || !lessonsCount || !totalTransfer) {
      setSubmitError("יש למלא את כל שדות החובה לפני השליחה.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const payload: PaymentRequestPayload = {
      submitterId: currentSession.teacherId,
      supplierId: currentSession.supplierId,
      teacherName: currentSession.teacherName,
      paymentType: "private_lessons",
      privateLessonId: Number(privateLessonId),
      lessonsCount: Number(lessonsCount),
      totalTransfer: Number(totalTransfer),
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
      description={<p>יש לבחור את התלמיד מהרשימה, לציין כמה שיעורים התקיימו ואת הסכום הכולל לתשלום.</p>}
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
              label: `${lesson.studentName} (${lesson.lessonsRemaining} נותרים מתוך ${lesson.lessonsPurchased})`,
            }))}
            value={privateLessonId}
            onValueChange={setPrivateLessonId}
            placeholder="בחר תלמיד"
            searchPlaceholder="חיפוש תלמיד..."
            emptyText="לא נמצאו תלמידים מתאימים"
          />
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lessonsCount">מספר שיעורים לתשלום</Label>
          <Input
            id="lessonsCount"
            type="number"
            min={1}
            max={selectedLesson?.lessonsPurchased ?? undefined}
            placeholder="1"
            value={lessonsCount}
            onChange={(event) => setLessonsCount(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalTransfer">סכום להעברה סה&quot;כ</Label>
          <Input
            id="totalTransfer"
            type="number"
            min={0}
            max={50000}
            placeholder="0"
            value={totalTransfer}
            onChange={(event) => setTotalTransfer(event.target.value)}
          />
        </div>
      </div>

      {submitError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{submitError}</div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={() => router.push("/")}>
          חזרה ←
        </Button>
        <Button onClick={() => void handleSubmit()} disabled={submitting || loading}>
          {submitting ? "שולח..." : "שליחת בקשה"}
        </Button>
      </div>
    </FormPageShell>
  );
}
