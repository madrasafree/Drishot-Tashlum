// /admin/users — manage portal access for active teachers. When the access
// column is not mapped in Monday (real mode), action buttons are hidden and
// a banner explains what is missing. Monday failures degrade into alerts.

import { isPortalPreviewAuth } from "@/lib/auth/current-user";
import { requireAdmin } from "@/lib/auth/guards";
import { TEACHER_PORTAL_COLUMNS } from "@/lib/monday/portal-mappings";
import { getAllPortalTeachers } from "@/lib/monday/teachers";
import type { AppAccessStatus, PortalRole, PortalTeacher } from "@/lib/monday/portal-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

import { AccessActions } from "./_components/access-actions";

export const dynamic = "force-dynamic";

const ACCESS_STATUS_PRESENTATION: Record<AppAccessStatus, { label: string; className: string }> = {
  approved: { label: "מאושר", className: "bg-emerald-100 text-emerald-800" },
  pending: { label: "ממתין", className: "bg-amber-100 text-amber-800" },
  blocked: { label: "חסום", className: "bg-red-100 text-red-800" },
  unknown: { label: "לא ידוע", className: "bg-slate-100 text-slate-600" },
};

const ROLE_LABELS: Record<PortalRole, string> = {
  teacher: "מורה",
  mentor: "מנטור",
  training_manager: "מנהל/ת הכשרה",
  admin: "אדמין",
};

function AccessStatusChip({ status }: { status: AppAccessStatus }) {
  const presentation = ACCESS_STATUS_PRESENTATION[status];

  return (
    <span
      className={`inline-block rounded-full px-3 py-0.5 text-xs font-bold ${presentation.className}`}
    >
      {presentation.label}
    </span>
  );
}

export default async function AdminUsersPage() {
  await requireAdmin();

  const isPreview = isPortalPreviewAuth();
  const accessColumnMapped = Boolean(TEACHER_PORTAL_COLUMNS.APP_ACCESS_STATUS);
  const actionsEnabled = accessColumnMapped || isPreview;

  let teachers: PortalTeacher[] | null = null;
  let loadError: string | null = null;

  try {
    teachers = await getAllPortalTeachers();
  } catch (error) {
    loadError =
      error instanceof Error
        ? `שגיאה בטעינת רשימת המורים ממאנדיי: ${error.message}`
        : "שגיאה לא צפויה בטעינת רשימת המורים.";
  }

  return (
    <div className="space-y-6" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-950">ניהול משתמשים</h1>
        <p className="text-slate-600">
          המורים הפעילים בלוח המורים במאנדיי וסטטוס הגישה שלהם לפורטל.
        </p>
      </header>

      {!actionsEnabled ? (
        <Alert>
          <AlertDescription>
            עמודת הרשאות הגישה עדיין לא מוגדרת במאנדיי — אישור/חסימה יופעלו לאחר המיפוי
          </AlertDescription>
        </Alert>
      ) : null}

      {isPreview ? (
        <Alert>
          <AlertDescription>
            מצב תצוגה מקדימה — פעולות אישור/חסימה לא נשמרות במאנדיי.
          </AlertDescription>
        </Alert>
      ) : null}

      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>שגיאת מאנדיי</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : teachers && teachers.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-600">
            לא נמצאו מורים פעילים.
          </CardContent>
        </Card>
      ) : teachers ? (
        <Card>
          <CardContent className="px-0 pb-0 pt-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-4 py-3 font-semibold">שם</th>
                    <th className="px-4 py-3 font-semibold">אימייל</th>
                    <th className="px-4 py-3 font-semibold">טלפון</th>
                    <th className="px-4 py-3 font-semibold">תיק ספק</th>
                    <th className="px-4 py-3 font-semibold">סטטוס גישה</th>
                    <th className="px-4 py-3 font-semibold">תפקיד</th>
                    {actionsEnabled ? (
                      <th className="px-4 py-3 font-semibold">פעולות</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr key={teacher.itemId} className="border-b border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-900">{teacher.name}</td>
                      <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                        {teacher.email || "—"}
                      </td>
                      <td className="px-4 py-3" dir="ltr">
                        {teacher.phone || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {teacher.supplierFileStatus || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <AccessStatusChip status={teacher.appAccessStatus} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {teacher.role ? ROLE_LABELS[teacher.role] : "—"}
                      </td>
                      {actionsEnabled ? (
                        <td className="px-4 py-3">
                          <AccessActions teacherItemId={teacher.itemId} />
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
