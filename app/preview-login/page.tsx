import { notFound } from "next/navigation";

import { ROLE_LABELS } from "@/components/portal/labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isPortalPreviewAuth } from "@/lib/auth/current-user";
import { getMockPortalTeachers } from "@/lib/monday/portal-mock";

import { switchPreviewUser } from "./actions";

export const dynamic = "force-dynamic";

const ACCESS_NOTES: Record<string, string> = {
  pending: "ממתין לאישור",
  blocked: "חסום",
};

export default function PreviewLoginPage() {
  if (!isPortalPreviewAuth()) {
    notFound();
  }

  const teachers = getMockPortalTeachers();

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>החלפת משתמש — מצב תצוגה מקדימה</CardTitle>
        <p className="text-sm text-slate-600">
          עמוד זה זמין רק במצב תצוגה מקדימה (ללא טוקן מאנדיי) ומאפשר לבדוק את
          הפורטל בתפקידים שונים.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {teachers.map((teacher) => (
            <li
              key={teacher.itemId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-100 bg-white/85 px-4 py-3"
            >
              <div>
                <p className="font-semibold text-slate-900">{teacher.name}</p>
                <p className="text-sm text-slate-500" dir="ltr">
                  {teacher.email}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">
                  {teacher.role ? ROLE_LABELS[teacher.role] : "מורה"}
                  {ACCESS_NOTES[teacher.appAccessStatus]
                    ? ` · ${ACCESS_NOTES[teacher.appAccessStatus]}`
                    : ""}
                </span>
                <form action={switchPreviewUser}>
                  <input type="hidden" name="email" value={teacher.email} />
                  <Button type="submit" size="sm" variant="outline">
                    כניסה
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
