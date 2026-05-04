"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { BookOpen, FileText, Home, RefreshCcw, Sparkles, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PaymentType } from "@/lib/monday/types";
import { clearSession, saveSession } from "@/lib/session";
import { cn } from "@/lib/utils";

type PreviewRoute = {
  label: string;
  route: Route;
  paymentType?: PaymentType;
  icon: typeof Home;
};

const previewRoutes: PreviewRoute[] = [
  { label: "פתיחה", route: "/?preview=1" as Route, icon: Home },
  { label: "קורס", route: "/submit/course", paymentType: "course", icon: BookOpen },
  { label: "החלפה", route: "/submit/replacement", paymentType: "replacement", icon: RefreshCcw },
  { label: "פרטיים", route: "/submit/private", paymentType: "private_lessons", icon: Target },
  { label: "אחר", route: "/submit/other", paymentType: "other", icon: FileText },
];

const previewTeacher = {
  teacherId: 101,
  teacherName: "יעל כהן",
  supplierId: 1001,
  supplierFileStatus: "הכל פיקס",
} as const;

export function PreviewNav({ className }: { className?: string }) {
  const router = useRouter();

  function navigate(route: PreviewRoute) {
    if (!route.paymentType) {
      clearSession();
      router.push(route.route);
      return;
    }

    saveSession({
      ...previewTeacher,
      paymentType: route.paymentType,
      previewMode: true,
    });
    router.push(route.route);
  }

  return (
    <section
      aria-label="ניווט תצוגה מקדימה"
      className={cn(
        "rounded-[1.4rem] border border-white/70 bg-white/80 p-3 shadow-[0_16px_45px_rgba(46,139,184,0.12)] backdrop-blur",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2 px-1 text-xs font-semibold text-slate-600">
        <Sparkles className="h-4 w-4 text-[var(--madrasa-green-dark)]" />
        <span>סיור מהיר לפני חיבור Monday</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {previewRoutes.map((route) => {
          const Icon = route.icon;
          return (
            <Button
              key={route.route}
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full border border-sky-100 bg-white/85 px-3 text-slate-700 shadow-sm hover:border-[var(--madrasa-blue)] hover:bg-sky-50 hover:text-[var(--madrasa-blue-dark)]"
              onClick={() => navigate(route)}
            >
              <Icon className="h-4 w-4" />
              {route.label}
            </Button>
          );
        })}
      </div>
    </section>
  );
}
