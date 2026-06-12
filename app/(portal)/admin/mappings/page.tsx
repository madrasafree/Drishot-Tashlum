// /admin/mappings — instructional view of the Monday mapping requirements:
// what is configured, what is missing, and exactly how to fix each row
// (env var for boards, code mapping for columns).

import { requireAdmin } from "@/lib/auth/guards";
import {
  getMissingRequiredMappings,
  getPortalMappingDiagnostics,
} from "@/lib/monday/portal-mappings";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

function fixInstruction(scope: "board" | "column" | "env", key: string): string {
  if (scope === "board" || scope === "env") {
    return `הגדירו את משתנה הסביבה ${key} (בפיתוח: קובץ ‎.env, בענן: wrangler vars/secrets בפרויקט Cloudflare).`;
  }

  return "מצאו או צרו את העמודה במאנדיי, ועדכנו את מזהה העמודה בקובץ lib/monday/portal-mappings.ts.";
}

export default async function AdminMappingsPage() {
  await requireAdmin();

  const diagnostics = getPortalMappingDiagnostics();
  const missingRequired = getMissingRequiredMappings();

  return (
    <div className="space-y-8" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-950">מיפויי מאנדיי</h1>
        <p className="text-slate-600">
          כל יכולת בפורטל נשענת על לוח או עמודה במאנדיי. כאן רואים מה כבר מחובר ואיך משלימים את
          החסר. פירוט מלא נמצא במסמך{" "}
          <span className="font-mono text-sm" dir="ltr">
            docs/teacher-portal-monday-mappings.md
          </span>
          .
        </p>
      </header>

      {missingRequired.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>
            {missingRequired.length} מיפויי חובה חסרים
          </AlertTitle>
          <AlertDescription>
            עד שהם יושלמו, יכולות כמו מפגשים, נוכחות ויצוא יומן לא יפעלו במצב אמיתי (במצב תצוגה
            מקדימה הכל עובד עם נתוני דמה).
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertTitle>כל מיפויי החובה מוגדרים</AlertTitle>
          <AlertDescription>אפשר להגדיר גם מיפויי רשות כדי להפעיל יכולות נוספות.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">איך מתקנים מיפוי חסר?</CardTitle>
          <CardDescription>
            <span className="font-semibold">לוח (board):</span> מזהה הלוח מגיע ממשתנה סביבה — למשל{" "}
            <span className="font-mono" dir="ltr">PORTAL_MEETINGS_BOARD_ID</span> או{" "}
            <span className="font-mono" dir="ltr">PORTAL_MATERIALS_BOARD_ID</span> — שמוגדר דרך{" "}
            <span className="font-mono" dir="ltr">wrangler</span> (vars/secrets) בפריסה או בקובץ{" "}
            <span className="font-mono" dir="ltr">.env</span> בפיתוח.{" "}
            <span className="font-semibold">עמודה (column):</span> מזהה העמודה נקבע בקוד — עורכים את{" "}
            <span className="font-mono" dir="ltr">lib/monday/portal-mappings.ts</span> ומריצים
            פריסה. לעולם לא מנחשים מזהים — מעתיקים אותם ממאנדיי.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-right text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-2 font-semibold">תיאור</th>
                  <th className="px-3 py-2 font-semibold">מפתח</th>
                  <th className="px-3 py-2 font-semibold">חובה</th>
                  <th className="px-3 py-2 font-semibold">סטטוס</th>
                  <th className="px-3 py-2 font-semibold">איך מגדירים</th>
                </tr>
              </thead>
              <tbody>
                {diagnostics.map((diagnostic) => {
                  const isMissingRequired = diagnostic.required && !diagnostic.configured;

                  return (
                    <tr
                      key={diagnostic.key}
                      className={`border-b border-slate-100 align-top ${isMissingRequired ? "bg-red-50" : ""}`}
                    >
                      <td className="px-3 py-2">
                        <div>{diagnostic.label}</div>
                        <div className="text-xs text-slate-500">{diagnostic.consumers}</div>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs" dir="ltr">
                        {diagnostic.key}
                      </td>
                      <td className="px-3 py-2">
                        {diagnostic.required ? (
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800">
                            חובה
                          </span>
                        ) : (
                          <span className="text-slate-400">רשות</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {diagnostic.configured ? (
                          <span className="font-semibold text-[var(--madrasa-green-dark)]">
                            מוגדר{" "}
                            <span className="font-mono text-xs text-slate-500" dir="ltr">
                              ({diagnostic.value})
                            </span>
                          </span>
                        ) : (
                          <span className="font-semibold text-red-600">חסר</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {diagnostic.configured
                          ? "—"
                          : fixInstruction(diagnostic.scope, diagnostic.key)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
