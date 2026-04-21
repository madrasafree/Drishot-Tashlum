"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { FormPageShell } from "@/components/form-page-shell";
import { LoadingSpinner } from "@/components/loading-spinner";
import { SearchSelect } from "@/components/search-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Course, PaymentRequestPayload } from "@/lib/monday/types";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { useSessionGuard } from "@/hooks/use-session-guard";

export default function CourseSubmitPage() {
  const router = useRouter();
  const { session, isReady } = useSessionGuard();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseId, setCourseId] = useState("");
  const [teachingAmount, setTeachingAmount] = useState("");
  const [travelAmount, setTravelAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let ignore = false;

    async function loadCourses() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/monday/courses?teacherId=${session.teacherId}`);
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
  }, [session]);

  if (!isReady || !session) {
    return null;
  }

  async function handleSubmit() {
    if (!courseId || !teachingAmount) {
      setSubmitError("יש למלא את כל שדות החובה לפני השליחה.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const payload: PaymentRequestPayload = {
      submitterId: session.teacherId,
      supplierId: session.supplierId,
      teacherName: session.teacherName,
      paymentType: "course",
      courseId: Number(courseId),
      teachingAmount: Number(teachingAmount),
      travelAmount: travelAmount ? Number(travelAmount) : 0,
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
      title="דרישת תשלום עבור קורס"
      description={
        <>
          <p>עבור כל קורס עליכם למלא טופס נפרד, לא ניתן למלא שתי דרישות תשלום באותו הטופס.</p>
          <p>יש לפרט את הסכום עבור הוראה ועבור נסיעות כפי שסוכם ב&apos;מייל פתיחת קורס למורה&apos;.</p>
          <p>
            במידה והיו החלפות בקורס יש לקזז את הסכום היחסי. אם ההחלפה התבצעה לאחר הגשת הדרישה
            עליך לעדכן את המשרד במייל office@madrasafree.com
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
              label: `${course.name} (${formatShortDate(course.startDate)})`,
              description: `תעריף צפוי: ${formatCurrency(course.teachingRate)} + ${formatCurrency(course.travelRate)} נסיעות`,
            }))}
            value={courseId}
            onValueChange={setCourseId}
            placeholder="בחר קורס"
            searchPlaceholder="חיפוש קורס..."
            emptyText="לא נמצאו קורסים מתאימים"
          />
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="teachingAmount">הוראה - סכום</Label>
          <Input
            id="teachingAmount"
            type="number"
            min={0}
            max={50000}
            placeholder="0"
            value={teachingAmount}
            onChange={(event) => setTeachingAmount(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="travelAmount">נסיעות - סכום</Label>
          <Input
            id="travelAmount"
            type="number"
            min={0}
            max={10000}
            placeholder="0"
            value={travelAmount}
            onChange={(event) => setTravelAmount(event.target.value)}
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
