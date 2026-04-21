"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, CircleDashed, FileText, RefreshCcw, Target } from "lucide-react";
import { useEffect, useState } from "react";

import { LoadingSpinner } from "@/components/loading-spinner";
import { SearchSelect } from "@/components/search-select";
import { SupplierBlockedAlert } from "@/components/supplier-blocked-alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import type { SupplierCheckResult, Teacher, PaymentType } from "@/lib/monday/types";
import { saveSession } from "@/lib/session";

const paymentTypeOptions: Array<{
  value: PaymentType;
  label: string;
  icon: typeof BookOpen;
  route: Route;
}> = [
  { value: "course", label: "קורס", icon: BookOpen, route: "/submit/course" },
  { value: "replacement", label: "החלפה", icon: RefreshCcw, route: "/submit/replacement" },
  { value: "private_lessons", label: "שיעורים פרטיים", icon: Target, route: "/submit/private" },
  { value: "other", label: "אחר", icon: FileText, route: "/submit/other" },
];

export default function HomePage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [teachersError, setTeachersError] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [paymentType, setPaymentType] = useState<PaymentType>("course");
  const [supplierCheck, setSupplierCheck] = useState<SupplierCheckResult | null>(null);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplierError, setSupplierError] = useState<string | null>(null);

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
      } catch (error) {
        if (!ignore) {
          setTeachersError(error instanceof Error ? error.message : "שגיאה לא צפויה.");
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
    let ignore = false;

    async function runSupplierCheck() {
      if (!selectedTeacherId) {
        setSupplierCheck(null);
        setSupplierError(null);
        return;
      }

      setSupplierLoading(true);
      setSupplierError(null);

      try {
        const response = await fetch(`/api/monday/supplier-check?teacherId=${selectedTeacherId}`);
        if (!response.ok) {
          const errorPayload = (await response.json()) as { error?: string };
          throw new Error(errorPayload.error || "לא הצלחנו לבדוק את תיק הספק.");
        }

        const data = (await response.json()) as SupplierCheckResult;
        if (!ignore) {
          setSupplierCheck(data);
        }
      } catch (error) {
        if (!ignore) {
          setSupplierError(error instanceof Error ? error.message : "שגיאה בבדיקת תיק הספק.");
          setSupplierCheck(null);
        }
      } finally {
        if (!ignore) {
          setSupplierLoading(false);
        }
      }
    }

    void runSupplierCheck();

    return () => {
      ignore = true;
    };
  }, [selectedTeacherId]);

  const selectedTeacher = teachers.find((teacher) => teacher.id === Number(selectedTeacherId));
  const selectedRoute =
    paymentTypeOptions.find((option) => option.value === paymentType)?.route || ("/" as Route);
  const isContinueDisabled =
    !selectedTeacher || !supplierCheck || supplierLoading || !!supplierError || supplierCheck?.blocked;

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="space-y-4">
        <CardTitle>הגשת דרישת תשלום למורה</CardTitle>
        <div className="space-y-4 text-base text-slate-600">
          <p>מורה יקר, לפניך טופס הגשת דרישת תשלום.</p>
          <p>
            עליך למלא טופס עבור כל קורס בנפרד, לא ניתן למלא שתי דרישות תשלום באותו
            טופס.
          </p>
          <p>
            כדי להגיש בקשת תשלום עליך להעביר למשרד מדרסה (
            <a className="font-medium text-[var(--madrasa-blue-dark)] underline" href="mailto:office@madrasafree.com">
              office@madrasafree.com
            </a>
            ) מסמכי עוסק / תיאום מס בתוקף, ואת פרטי חשבון הבנק שלך. במידה ואין
            מסמכים המערכת לא תאפשר הגשת טופס.
          </p>
          <p>
            <Link
              className="font-medium text-[var(--madrasa-blue-dark)] underline"
              href="https://www.gov.il/he/service/itc101"
              target="_blank"
              rel="noreferrer"
            >
              הנחיות: טופס ניכוי מס לעובד שכיר
            </Link>
          </p>
          <p>שימו לב - החל מ-1.8.25 ניתן להגיש דרישה רק בסיום הקורס. יש לקזז שיעורי החלפה במידה והיו.</p>
          <p>התשלום יעבור בשוטף 30+ (סוף החודש הבא)</p>
          <p>במידה והינך עוסק פטור/מורשה – לאחר קבלת התשלום עליך לשלוח קבלה.</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-3">
          <Label htmlFor="teacher-select">בחירת מורה</Label>
          {teachersLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-11 w-full" />
              <p className="text-sm text-slate-500">טוען את רשימת המורים...</p>
            </div>
          ) : teachersError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {teachersError}
            </div>
          ) : (
            <SearchSelect
              options={teachers.map((teacher) => ({
                value: String(teacher.id),
                label: teacher.name,
                description: teacher.email || undefined,
              }))}
              value={selectedTeacherId}
              onValueChange={setSelectedTeacherId}
              placeholder="בחר את שמך מתוך הרשימה"
              searchPlaceholder="חיפוש מורה..."
              emptyText="לא נמצאו מורים מתאימים"
            />
          )}
        </section>

        {selectedTeacherId ? (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <CircleDashed className="h-4 w-4 text-[var(--madrasa-blue-dark)]" />
              <span>בדיקת תוקף ספק</span>
            </div>
            {supplierLoading ? <LoadingSpinner label="בודק את תיק הספק..." /> : null}
            {!supplierLoading && supplierCheck?.blocked ? <SupplierBlockedAlert /> : null}
            {!supplierLoading && supplierError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {supplierError}
              </div>
            ) : null}
            {!supplierLoading && supplierCheck && !supplierCheck.blocked ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                תיק הספק תקין וניתן להמשיך להגשת הדרישה.
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="space-y-4">
          <Label>בחירת סוג תשלום</Label>
          <RadioGroup value={paymentType} onValueChange={(value) => setPaymentType(value as PaymentType)}>
            {paymentTypeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-sky-300 hover:bg-sky-50/40"
                >
                  <RadioGroupItem value={option.value} className="mt-1" />
                  <Icon className="mt-0.5 h-5 w-5 text-[var(--madrasa-blue-dark)]" />
                  <div className="font-medium text-slate-900">{option.label}</div>
                </label>
              );
            })}
          </RadioGroup>
        </section>

        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={() => {
              if (!selectedTeacher || !supplierCheck || supplierCheck.blocked || !supplierCheck.supplierId) {
                return;
              }

              saveSession({
                teacherId: selectedTeacher.id,
                teacherName: selectedTeacher.name,
                supplierId: supplierCheck.supplierId,
                supplierFileStatus: supplierCheck.teacherSupplierStatus,
                paymentType,
              });
              router.push(selectedRoute);
            }}
            disabled={isContinueDisabled}
          >
            המשך
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
