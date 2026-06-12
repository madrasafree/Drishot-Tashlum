// /admin/diagnostics — full system health view: auth mode, Monday token
// presence (never the token itself), the complete mapping table and duplicate
// teacher emails. Monday failures degrade into Hebrew alerts.

import { getAuthMode, isPortalPreviewAuth } from "@/lib/auth/current-user";
import { requireAdmin } from "@/lib/auth/guards";
import { isMondayPreviewMode } from "@/lib/monday/mock";
import { getPortalMappingDiagnostics } from "@/lib/monday/portal-mappings";
import { getDuplicateTeacherEmails } from "@/lib/monday/teachers";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

const SCOPE_LABELS: Record<string, string> = {
  board: "לוח",
  column: "עמודה",
  env: "משתנה סביבה",
};

type DuplicateEmails = Awaited<ReturnType<typeof getDuplicateTeacherEmails>>;

export default async function AdminDiagnosticsPage() {
  await requireAdmin();

  const authMode = getAuthMode();
  const isPreview = isPortalPreviewAuth();
  const hasMondayToken = !isMondayPreviewMode();
  const diagnostics = getPortalMappingDiagnostics();

  let duplicates: DuplicateEmails | null = null;
  let duplicatesError: string | null = null;

  try {
    duplicates = await getDuplicateTeacherEmails();
  } catch (error) {
    duplicatesError =
      error instanceof Error
        ? `שגיאה בשליפת רשימת המורים ממאנדיי: ${error.message}`
        : "שגיאה לא צפויה בשליפת רשימת המורים ממאנדיי.";
  }

  return (
    <div className="space-y-8" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-950">דיאגנוסטיקה</h1>
        <p className="text-slate-600">מצב החיבור של פורטל המורים למאנדיי ולמערכת ההתחברות.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">סביבה והתחברות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>
            מצב התחברות:{" "}
            <span className="font-semibold">
              {authMode === "cloudflare" ? "Cloudflare Access" : "תצוגה מקדימה (preview)"}
            </span>
            {isPreview ? (
              <span className="mr-2 rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-800">
                תצוגה מקדימה
              </span>
            ) : null}
          </p>
          <p>
            טוקן מאנדיי מוגדר:{" "}
            <span className={hasMondayToken ? "font-semibold text-[var(--madrasa-green-dark)]" : "font-semibold text-red-600"}>
              {hasMondayToken ? "כן" : "לא"}
            </span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">מיפויי לוחות ועמודות</CardTitle>
          <CardDescription>
            שורות מודגשות באדום הן מיפויי חובה שעדיין חסרים. הוראות תיקון מפורטות נמצאות בעמוד
            המיפויים.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-2 font-semibold">תיאור</th>
                  <th className="px-3 py-2 font-semibold">מפתח</th>
                  <th className="px-3 py-2 font-semibold">סוג</th>
                  <th className="px-3 py-2 font-semibold">חובה</th>
                  <th className="px-3 py-2 font-semibold">מוגדר</th>
                  <th className="px-3 py-2 font-semibold">ערך</th>
                  <th className="px-3 py-2 font-semibold">בשימוש עבור</th>
                </tr>
              </thead>
              <tbody>
                {diagnostics.map((diagnostic) => {
                  const isMissingRequired = diagnostic.required && !diagnostic.configured;

                  return (
                    <tr
                      key={diagnostic.key}
                      className={`border-b border-slate-100 ${isMissingRequired ? "bg-red-50" : ""}`}
                    >
                      <td className="px-3 py-2">{diagnostic.label}</td>
                      <td className="px-3 py-2 font-mono text-xs" dir="ltr">
                        {diagnostic.key}
                      </td>
                      <td className="px-3 py-2">{SCOPE_LABELS[diagnostic.scope] ?? diagnostic.scope}</td>
                      <td className="px-3 py-2">
                        {diagnostic.required ? (
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800">
                            חובה
                          </span>
                        ) : (
                          <span className="text-slate-400">רשות</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {diagnostic.configured ? (
                          <span className="font-bold text-[var(--madrasa-green-dark)]">✓</span>
                        ) : (
                          <span className="font-bold text-red-600">✗</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs" dir="ltr">
                        {diagnostic.configured ? diagnostic.value : "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{diagnostic.consumers}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">אימיילים כפולים</CardTitle>
          <CardDescription>
            אימייל שמופיע ביותר מכרטיס מורה אחד חוסם התחברות — יש לאחד את הכרטיסים במאנדיי.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {duplicatesError ? (
            <Alert variant="destructive">
              <AlertTitle>שגיאת מאנדיי</AlertTitle>
              <AlertDescription>{duplicatesError}</AlertDescription>
            </Alert>
          ) : duplicates && duplicates.length > 0 ? (
            <ul className="space-y-3 text-sm">
              {duplicates.map((duplicate) => (
                <li key={duplicate.email} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <span className="font-mono font-semibold" dir="ltr">
                    {duplicate.email}
                  </span>
                  <span className="mr-2 text-slate-700">
                    מופיע אצל:{" "}
                    {duplicate.teachers
                      .map((teacher) => `${teacher.name} (#${teacher.itemId})`)
                      .join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--madrasa-green-dark)]">
              לא נמצאו אימיילים כפולים בקרב המורים הפעילים.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
