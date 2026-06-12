// Shared course card for the dashboard and the courses index.
// PortalCourse never carries rates/amounts, so nothing sensitive renders here.

import Link from "next/link";

import { CHIP_BASE_CLASS, formatHebrewDateShort } from "@/components/portal/labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortalCourse } from "@/lib/monday/portal-types";
import { cn } from "@/lib/utils";

export function CourseCard({
  course,
  showTeachers = false,
}: {
  course: PortalCourse;
  showTeachers?: boolean;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {course.state && (
            <span
              className={cn(
                CHIP_BASE_CLASS,
                "border-[var(--madrasa-blue)]/25 bg-sky-50 text-[var(--madrasa-blue-dark)]",
              )}
            >
              {course.state}
            </span>
          )}
          {course.kind === "private_lessons" && (
            <span
              className={cn(
                CHIP_BASE_CLASS,
                "border-[var(--madrasa-green)]/30 bg-lime-50 text-[var(--madrasa-green-dark)]",
              )}
            >
              שיעורים פרטיים
              {course.studentName ? ` · ${course.studentName}` : ""}
            </span>
          )}
        </div>
        <CardTitle className="text-lg leading-7">{course.name}</CardTitle>
        {showTeachers && course.teacherNames.length > 0 && (
          <p className="text-sm text-slate-500">
            {course.teacherNames.length > 1 ? "מורים: " : "מורה: "}
            {course.teacherNames.join(", ")}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <ul className="space-y-1 text-sm text-slate-600">
          {(course.startDate || course.endDate) && (
            <li>
              <span className="font-semibold text-slate-800">תאריכים: </span>
              {formatHebrewDateShort(course.startDate)} – {formatHebrewDateShort(course.endDate)}
            </li>
          )}
          {course.lessonsCount !== null && (
            <li>
              <span className="font-semibold text-slate-800">מספר מפגשים: </span>
              {course.lessonsCount}
            </li>
          )}
          {course.location && (
            <li>
              <span className="font-semibold text-slate-800">מיקום: </span>
              {course.location}
            </li>
          )}
        </ul>

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <Button asChild size="sm">
            <Link href={`/courses/${course.itemId}`}>פרטים</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={`/api/calendar/course/${course.itemId}`}>יצוא ליומן</a>
          </Button>
          {course.zoomLink && (
            <Button asChild size="sm" variant="outline">
              <a href={course.zoomLink} target="_blank" rel="noopener noreferrer">
                קישור זום
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
