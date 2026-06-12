// /materials — training materials and useful links for teachers.
// Server component; data comes from Monday when a materials board is
// configured, otherwise from the curated local fallback list.

import { ExternalLink } from "lucide-react";

import { requirePortalUser } from "@/lib/auth/guards";
import { getTrainingMaterials } from "@/lib/monday/materials";
import type { MaterialLink } from "@/lib/monday/portal-types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

function groupByCategory(materials: MaterialLink[]): Map<string, MaterialLink[]> {
  const groups = new Map<string, MaterialLink[]>();

  for (const material of materials) {
    const category = material.category || "כללי";
    groups.set(category, [...(groups.get(category) ?? []), material]);
  }

  return groups;
}

export default async function MaterialsPage() {
  await requirePortalUser();

  const { materials, source } = await getTrainingMaterials();
  const groups = groupByCategory(materials);

  return (
    <div className="space-y-8" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-950">חומרי הדרכה</h1>
        <p className="text-slate-600">
          מערכי שיעור, מדריכים וקישורים שימושיים לצוות ההוראה של מדרסה.
        </p>
      </header>

      {materials.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-600">
            אין כרגע חומרי הדרכה זמינים. נסו שוב מאוחר יותר.
          </CardContent>
        </Card>
      ) : (
        Array.from(groups.entries()).map(([category, items]) => (
          <section key={category} className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--madrasa-blue-dark)]">{category}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((material) => (
                <Card key={material.id} className="flex flex-col">
                  <CardHeader className="flex-1">
                    <CardTitle className="text-lg">{material.title}</CardTitle>
                    {material.description ? (
                      <CardDescription>{material.description}</CardDescription>
                    ) : null}
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="outline" size="sm">
                      <a href={material.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        פתיחת הקישור
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}

      {source === "local" ? (
        <p className="text-sm text-slate-500">
          הרשימה מנוהלת כרגע בקובץ תצורה מקומי; ניתן לחבר לוח Monday ייעודי
          (PORTAL_MATERIALS_BOARD_ID).
        </p>
      ) : null}
    </div>
  );
}
