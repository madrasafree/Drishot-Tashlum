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
import type {
  Course,
  DuplicatePaymentRequestResult,
  PaymentRequestPayload,
  ReplacementLookupResult,
} from "@/lib/monday/types";
import { formatCurrency, formatShortDate } from "@/lib/utils";

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
      tone: "warning" as const,
      message: `⚠️ סכום ${directionLabel} חורג ב-${Math.round(deltaPercent)}% מהתעריף המוסכם. ודא שזה נכון.`,
    };
  }

  if (deltaPercent < -10) {
    return {
      tone: "info" as const,
      message: `ℹ️ סכום ${directionLabel} נמוך מהתעריף המוסכם. האם היו החלפות או קיזוזים?`,
    };
  }

  return null;
}

export default function CourseSubmitPage() {
  const router = useRouter();
  const { session, isReady } = useSessionGuard();
  const currentSession = session;
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseId, setCourseId] = useState("");
  const [teachingAmount, setTeachingAmount] = useState("");
  const [travelAmount, setTravelAmount] = useState("");
  const [duplicateResult, setDuplicateResult] = useState<DuplicatePaymentRequestResult>({
    isDuplicate: false,
  });
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [replacementsResult, setReplacementsResult] = useState<ReplacementLookupResult>({
    replacements: [],
    totalSuggestedDeduction: 0,
  });
  const [replacementsLoading, setReplacementsLoading] = useState(false);
  const [applyAutomaticDeduction, setApplyAutomaticDeduction] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedCourse = courses.find((course) => course.id === Number(courseId)) || null;
  const totalTeachingDeduction = replacementsResult.replacements.reduce(
    (sum, replacement) => sum + replacement.teachingAmount,
    0,
  );
  const totalTravelDeduction = replacementsResult.replacements.reduce(
    (sum, replacement) => sum + replacement.travelAmount,
    0,
  );

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
    if (!currentSession) {
      return;
    }

    let ignore = false;

    async function loadCourses() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/monday/courses?teacherId=${currentSession.teacherId}`);
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
    setTeachingAmount("");
    setTravelAmount("");
    setSubmitError(null);
    setDuplicateResult({ isDuplicate: false });
    setReplacementsResult({ replacements: [], totalSuggestedDeduction: 0 });
    setApplyAutomaticDeduction(false);
  }, [courseId]);

  useEffect(() => {
    if (!currentSession || !courseId) {
      return;
    }

    let ignore = false;

    async function loadDuplicateCheck() {
      setDuplicateLoading(true);

      try {
        const response = await fetch(
          `/api/monday/check-duplicate?teacherId=${currentSession.teacherId}&courseId=${courseId}`,
        );

        if (!response.ok) {
          throw new Error("Duplicate check failed.");
        }

        const data = (await response.json()) as DuplicatePaymentRequestResult;
        if (!ignore) {
          setDuplicateResult(data);
        }
      } catch (requestError) {
        console.warn("[Course Submit] Duplicate check failed", requestError);
        if (!ignore) {
          setDuplicateResult({ isDuplicate: false });
        }
      } finally {
        if (!ignore) {
          setDuplicateLoading(false);
        }
      }
    }

    void loadDuplicateCheck();

    return () => {
      ignore = true;
    };
  }, [courseId, currentSession]);

  useEffect(() => {
    if (!currentSession || !courseId) {
      return;
    }

    let ignore = false;

    async function loadReplacements() {
      setReplacementsLoading(true);

      try {
        const response = await fetch(
          `/api/monday/replacements?teacherId=${currentSession.teacherId}&courseId=${courseId}`,
        );

        if (!response.ok) {
          throw new Error("Replacements lookup failed.");
        }

        const data = (await response.json()) as ReplacementLookupResult;
        if (!ignore) {
          setReplacementsResult(data);
          setApplyAutomaticDeduction(data.replacements.length > 0);
        }
      } catch (requestError) {
        console.warn("[Course Submit] Replacement lookup failed", requestError);
        if (!ignore) {
          setReplacementsResult({ replacements: [], totalSuggestedDeduction: 0 });
          setApplyAutomaticDeduction(false);
        }
      } finally {
        if (!ignore) {
          setReplacementsLoading(false);
        }
      }
    }

    void loadReplacements();

    return () => {
      ignore = true;
    };
  }, [courseId, currentSession]);

  useEffect(() => {
    if (!selectedCourse || !applyAutomaticDeduction || !replacementsResult.replacements.length) {
      return;
    }

    setTeachingAmount(
      selectedCourse.teachingRate === null
        ? ""
        : String(Math.max(0, selectedCourse.teachingRate - totalTeachingDeduction)),
    );
    setTravelAmount(
      selectedCourse.travelRate === null
        ? ""
        : String(Math.max(0, selectedCourse.travelRate - totalTravelDeduction)),
    );
  }, [
    applyAutomaticDeduction,
    replacementsResult.replacements.length,
    selectedCourse,
    totalTeachingDeduction,
    totalTravelDeduction,
  ]);

  if (!isReady || !currentSession) {
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
      submitterId: currentSession.teacherId,
      supplierId: currentSession.supplierId,
      teacherName: currentSession.teacherName,
      paymentType: "course",
      courseId: Number(courseId),
      teachingAmount: Number(teachingAmount),
      travelAmount: travelAmount ? Number(travelAmount) : 0,
      deductionSummary:
        applyAutomaticDeduction && replacementsResult.replacements.length
          ? {
              applied: true,
              replacements: replacementsResult.replacements,
              totalTeachingDeduction,
              totalTravelDeduction,
              totalSuggestedDeduction: replacementsResult.totalSuggestedDeduction,
            }
          : null,
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

      {selectedCourse ? (
        <div className="space-y-3">
          <CourseRateBox
            teachingRate={selectedCourse.teachingRate}
            travelRate={selectedCourse.travelRate}
          />

          {duplicateLoading ? <LoadingSpinner label="בודק אם כבר הוגשה דרישת תשלום על הקורס..." /> : null}

          {duplicateResult.isDuplicate && duplicateResult.existingItem ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
              <div className="mb-2 font-semibold">🚫 כבר הוגשה דרישת תשלום על הקורס הזה</div>
              <p>
                הגשת את הדרישה ב-{formatShortDate(duplicateResult.existingItem.submitDate)} (סטטוס:{" "}
                {duplicateResult.existingItem.status}).
              </p>
              <p className="mt-2">
                לא ניתן להגיש דרישה נוספת על אותו הקורס. אם הדרישה הקיימת שגויה, פנה למשרד
                מדרסה (office@madrasafree.com) לביטולה ואז תוכל להגיש מחדש.
              </p>
            </div>
          ) : null}

          {replacementsLoading ? <LoadingSpinner label="מחפש החלפות רלוונטיות לקיזוז..." /> : null}

          {replacementsResult.replacements.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
              <div className="mb-3 font-semibold">🔄 נמצאו החלפות בקורס הזה</div>
              <p className="mb-3">הוחלפת בקורס הזה בהחלפות הבאות:</p>
              <ul className="space-y-2">
                {replacementsResult.replacements.map((replacement) => (
                  <li key={replacement.id}>
                    • {replacement.replacementDate} - {replacement.replacingTeacherName} -{" "}
                    {formatCurrency(replacement.totalAmount)}
                  </li>
                ))}
              </ul>
              <div className="mt-4 font-semibold">
                סה&quot;כ קיזוז מוצע: {formatCurrency(replacementsResult.totalSuggestedDeduction)}
              </div>
              <label className="mt-4 flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={applyAutomaticDeduction}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setApplyAutomaticDeduction(checked);

                    if (!checked) {
                      setTeachingAmount("");
                      setTravelAmount("");
                    }
                  }}
                />
                <span>לקזז אוטומטית מהסכום</span>
              </label>
            </div>
          ) : null}
        </div>
      ) : null}

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
          {teachingWarning ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {teachingWarning.message}
            </div>
          ) : null}
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
        <Button
          onClick={() => void handleSubmit()}
          disabled={submitting || loading || duplicateLoading || replacementsLoading || duplicateResult.isDuplicate}
        >
          {submitting ? "שולח..." : "שליחת בקשה"}
        </Button>
      </div>
    </FormPageShell>
  );
}
