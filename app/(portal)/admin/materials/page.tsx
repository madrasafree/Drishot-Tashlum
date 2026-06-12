// /admin/materials — shows the list teachers see on /materials and where it
// comes from (Monday board vs. local typed fallback).

import { getPortalErrorMessage, SectionError } from "@/components/portal/section-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";
import { getTrainingMaterials } from "@/lib/monday/materials";
import type { MaterialLink } from "@/lib/monday/portal-types";

export const dynamic = "force-dynamic";

export default async function AdminMaterialsPage() {
  await requireAdmin();

  let materials: MaterialLink[] = [];
  let source: "monday" | "local" = "local";
  let loadError: string | null = null;

  try {
    const result = await getTrainingMaterials();
    materials = result.materials;
    source = result.source;
  } catch (error) {
    loadError = getPortalErrorMessage(error);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>חומרי הדרכה</CardTitle>
          <p className="text-sm text-slate-600">
            מקור הנתונים הנוכחי:{" "}
            <span className="font-semibold">
              {source === "monday" ? "לוח מאנדיי" : "קובץ תצורה מקומי"}
            </span>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {source === "local" ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              לוח חומרים במאנדיי לא הוגדר. הרשימה מנוהלת בקובץ{" "}
              <code dir="ltr">lib/monday/materials-local.ts</code>. כדי לחבר לוח
              מאנדיי: הגדירו את משתנה הסביבה{" "}
              <code dir="ltr">PORTAL_MATERIALS_BOARD_ID</code> ומלאו את עמודות
              MATERIALS בקובץ <code dir="ltr">lib/monday/portal-mappings.ts</code>.
            </div>
          ) : null}

          {loadError ? (
            <SectionError title="לא ניתן לטעון את החומרים" message={loadError} />
          ) : !materials.length ? (
            <p className="text-sm text-slate-600">אין חומרים להצגה.</p>
          ) : (
            <ul className="space-y-2">
              {materials.map((material) => (
                <li
                  key={material.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-100 bg-white/85 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{material.title}</p>
                    {material.description ? (
                      <p className="text-sm text-slate-500">{material.description}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                      {material.category}
                    </span>
                    <a
                      href={material.url}
                      target="_blank"
                      rel="noreferrer"
                      dir="ltr"
                      className="font-medium text-[var(--madrasa-blue-dark)] underline underline-offset-4"
                    >
                      {material.url}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
