// /admin — administration overview: headline health stats and navigation to
// the admin sub-pages. Every Monday call degrades into a "—" stat so a
// missing mapping or API failure never crashes the page.

import type { Route } from "next";
import Link from "next/link";

import { getAuthMode, isPortalPreviewAuth } from "@/lib/auth/current-user";
import { requireAdmin } from "@/lib/auth/guards";
import { getMissingRequiredMappings } from "@/lib/monday/portal-mappings";
import { getAllPortalTeachers, getDuplicateTeacherEmails } from "@/lib/monday/teachers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

const ADMIN_SECTIONS: Array<{ href: string; title: string; description: string }> = [
  {
    href: "/admin/users",
    title: "ניהול משתמשים",
    description: "רשימת המורים הפעילים, סטטוס גישה לאפליקציה ואישור או חסימה.",
  },
  {
    href: "/admin/mappings",
    title: "מיפויי מאנדיי",
    description: "אילו לוחות ועמודות כבר מחוברים, ומה צריך להגדיר כדי להפעיל יכולות.",
  },
  {
    href: "/admin/materials",
    title: "חומרי הדרכה",
    description: "הרשימה שמוצגת למורים בעמוד החומרים ומקור הנתונים שלה.",
  },
  {
    href: "/admin/diagnostics",
    title: "דיאגנוסטיקה",
    description: "מצב חיבור מלא: מצב התחברות, טוקן מאנדיי, מיפויים וכפילויות אימייל.",
  },
];

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "bad" | "good";
}) {
  const valueClass =
    tone === "bad"
      ? "text-red-600"
      : tone === "good"
        ? "text-[var(--madrasa-green-dark)]"
        : "text-slate-950";

  return (
    <Card>
      <CardContent className="px-6 py-5">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <p className={`mt-1 text-3xl font-extrabold ${valueClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function AdminOverviewPage() {
  await requireAdmin();

  const missingRequiredCount = getMissingRequiredMappings().length;
  const authMode = getAuthMode();
  const isPreview = isPortalPreviewAuth();

  let teacherCount: number | null = null;
  let duplicateEmailCount: number | null = null;

  try {
    teacherCount = (await getAllPortalTeachers()).length;
  } catch {
    // Monday unreachable / misconfigured — show "—" instead of crashing.
  }

  try {
    duplicateEmailCount = (await getDuplicateTeacherEmails()).length;
  } catch {
    // Same graceful degradation as above.
  }

  return (
    <div className="space-y-8" dir="rtl">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold text-slate-950">ניהול המערכת</h1>
          {isPreview ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              תצוגה מקדימה
            </span>
          ) : null}
        </div>
        <p className="text-slate-600">
          מצב התחברות:{" "}
          <span className="font-semibold">
            {authMode === "cloudflare" ? "Cloudflare Access" : "תצוגה מקדימה (preview)"}
          </span>
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="מיפויי חובה חסרים"
          value={String(missingRequiredCount)}
          tone={missingRequiredCount > 0 ? "bad" : "good"}
        />
        <StatCard
          label="מורים פעילים"
          value={teacherCount === null ? "—" : String(teacherCount)}
        />
        <StatCard
          label="אימיילים כפולים"
          value={duplicateEmailCount === null ? "—" : String(duplicateEmailCount)}
          tone={duplicateEmailCount !== null && duplicateEmailCount > 0 ? "bad" : "default"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {ADMIN_SECTIONS.map((section) => (
          <Link key={section.href} href={section.href as Route} className="group block">
            <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-[var(--madrasa-blue)]/40">
              <CardHeader>
                <CardTitle className="text-xl text-[var(--madrasa-blue-dark)]">
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
