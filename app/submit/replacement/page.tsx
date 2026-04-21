"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CourseRateBox } from "@/components/course-rate-box";
import { FormPageShell } from "@/components/form-page-shell";
import { LoadingSpinner } from "@/components/loading-spinner";
import { SearchSelect } from "@/components/search-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSessionGuard } from "@/hooks/use-session-guard";
import type { Course, PaymentRequestPayload, Teacher } from "@/lib/monday/types";
import { formatShortDate } from "@/lib/utils";

function toDisplayDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function getDeviationMessage(amountText: string, rate: number | null, directionLabel: string) {
  if (!amountText || rate === null || rate <= 0) {
    return null;
  }

  const amount = Number(amountText);
  if (!Number.isFinite(amount)) {
    return null;
  }

  const deltaPercent = ((amount - rate) / rate) * 100;

  if (deltaPercent > 10) {
    return {
      message: `⚠️ סכום ${directionLabel} חורג ב-${Math.round(deltaPercent)}% מהתעריף המוסכם. ודא שזה נכון.`,
    };
  }

  if (deltaPercent < -10) {
    return {
      message: `ℹ️ סכום ${directionLabel} נמוך מהתעריף המוסכם. האם היו החלפות או קיזוזים?`,
    };
  }

  return null;
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
  const [teachingAmount, setTeachingAmount] = useState("");
  const [travelAmount, setTravelAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedCourse = courses.find((course) => course.id === Number(courseId)) || null;
  const teachingWarning = getDeviationMessage(
    teachingAmount,
    selectedCourse?.teachingRate ?? null,
    "ההוראה",
  );
  const travelWarning = getDeviationMessage(
    travelAmount,
    selectedCourse?.travelRate ?? null,
    "הנסיעות",
  );

  useEffect(() => {
    let ignore = false;

    async function loadTeachers() {
      setTeachersLoading(true);
      setTeachersError(null);

      try {
        const response = await fetch("/api/monday/teachers");
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
  }, []);

  useEffect(() => {
    if (!replacedTeacherId) {
      setCourses([]);
      setCourseId("");
      return;
    }

    let ignore = false;

    async function loadCourses() {
      setCoursesLoading(true);
      setCoursesError(null);

      try {
        const response = await fetch(`/api/monday/courses?teacherId=${replacedTeacherId}`);
        if (!response.ok) {
          throw new Error("לא הצלחנו לטעון את קורסי המורה שהוחלף.");
        }

        const data = (await response.json()) as Course[];
        if (!ignore) {
          setCourses(data);
        }
      } catch (requestError) {
        if (!ignore) {
          setCoursesError(
            requestError instanceof Error ? requestError.message : "שגיאה בטעינת קורסים.",
          );
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
  }, [replacedTeacherId]);

  useEffect(() => {
    setTeachingAmount("");
    setTravelAmount("");
    setSubmitError(null);
  }, [courseId]);

  if (!isReady || !currentSession) {
    return null;
  }

  async function handleSubmit() {
    if (!replacedTeacherId || !courseId || !replacementDate || !teachingAmount) {
      setSubmitError("יש למלא את כל שדות החובה לפני השליחה.");
      return;
    }

    if (!currentSession) {
      return;
    }

    const sessionData = currentSession;
    setSubmitting(true);
    setSubmitError(null);

    const payload: PaymentRequestPayload = {
      submitterId: sessionData.teacherId,
      supplierId: sessionData.supplierId,
      teacherName: sessionData.teacherName,
      paymentType: "replacement",
      replacedTeacherId: Number(replacedTeacherId),
      courseId: Number(courseId),
      replacementDate: toDisplayDate(replacementDate),
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
      title="דרישת תשלום עבור החלפת מורה"
      description={
        <>
          <p>תודה שנרתמת לעזור בהחלפת מורה! כל הכבוד!</p>
          <p>עליך לפרט סכום לתשלום עבור הוראה ועבור נסיעות (אם היו).</p>
        </>
      }
    >
      <div className="space-y-2">
        <Label>את מי החלפתי</Label>
        {teachersLoading ? (
          <LoadingSpinner label="טוען מורים..." />
        ) : teachersError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{teachersError}</div>
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
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{coursesError}</div>
        ) : (
          <SearchSelect
            options={courses.map((course) => ({
              value: String(course.id),
              label: `${course.name} (${formatShortDate(course.startDate)})`,
            }))}
            value={courseId}
            onValueChange={setCourseId}
            placeholder="בחר קורס"
            searchPlaceholder="חיפוש קורס..."
            emptyText="לא נמצאו קורסים למורה זה"
            disabled={!replacedTeacherId}
          />
        )}
      </div>

      {selectedCourse ? (
        <CourseRateBox
          teachingRate={selectedCourse.teachingRate}
          travelRate={selectedCourse.travelRate}
        />
      ) : null}

      <div className="grid gap-5 sm:grid-cols-3">
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
          <Label htmlFor="replacementTeachingAmount">הוראה - סכום</Label>
          <Input
            id="replacementTeachingAmount"
            type="number"
            min={0}
            max={50000}
            placeholder="0"
            value={teachingAmount}
            onChange={(event) => setTeachingAmount(event.target.value)}
          />
          {teachingWarning ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {teachingWarning.message}
            </div>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="replacementTravelAmount">נסיעות - סכום</Label>
          <Input
            id="replacementTravelAmount"
            type="number"
            min={0}
            max={10000}
            placeholder="0"
            value={travelAmount}
            onChange={(event) => setTravelAmount(event.target.value)}
          />
          {travelWarning ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {travelWarning.message}
            </div>
          ) : null}
        </div>
      </div>

      {submitError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{submitError}</div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={() => router.push("/")}>
          חזרה ←
        </Button>
        <Button onClick={() => void handleSubmit()} disabled={submitting || teachersLoading || coursesLoading}>
          {submitting ? "שולח..." : "שליחת בקשה"}
        </Button>
      </div>
    </FormPageShell>
  );
}
