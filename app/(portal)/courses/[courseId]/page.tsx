// Course detail: details card + meetings list.
// Authorization: 404 (never 403) when the course is outside the user's
// visible teachers, so other teachers' data existence is never confirmed.

import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CHIP_BASE_CLASS, formatHebrewDate } from "@/components/portal/labels";
import { MeetingList } from "@/components/portal/meeting-list";
import { getPortalErrorMessage, SectionError } from "@/components/portal/section-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePortalUser } from "@/lib/auth/guards";
import { getVisibleTeacherIds } from "@/lib/auth/roles";
import { getPortalCourseById } from "@/lib/monday/courses";
import { getMeetingsForCourse } from "@/lib/monday/meetings";
import type { PortalMeeting } from "@/lib/monday/portal-types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const courseItemId = Number(courseId);

  if (!Number.isInteger(courseItemId) || courseItemId <= 0) {
    notFound();
  }

  const user = await requirePortalUser();
  const course = await getPortalCourseById(courseItemId);

  if (!course) {
    notFound();
  }

  const visible = getVisibleTeacherIds(user);
  if (visible && !course.teacherItemIds.some((id) => visible.includes(id))) {
    notFound();
  }

  let meetings: PortalMeeting[] | null = null;
  let meetingsError: string | null = null;
  try {
    meetings = await getMeetingsForCourse(courseItemId);
  } catch (error) {
    meetingsError = getPortalErrorMessage(error);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/courses"
          className="text-sm font-semibold text-[var(--madrasa-blue-dark)] underline underline-offset-4"
        >
          → חזרה לכל הקורסים
        </Link>
      </div>

      <Card>
        <CardHeader className="gap-3">
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
            <span
              className={cn(
                CHIP_BASE_CLASS,
                "border-[var(--madrasa-green)]/30 bg-lime-50 text-[var(--madrasa-green-dark)]",
              )}
            >
              {course.kind === "private_lessons" ? "שיעורים פרטיים" : "קורס"}
            </span>
          </div>
          <CardTitle>{course.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            {course.kind === "private_lessons" && course.studentName && (
              <li>
                <span className="font-semibold text-slate-900">תלמיד/ה: </span>
                {course.studentName}
              </li>
            )}
            {course.teacherNames.length > 0 && (
              <li>
                <span className="font-semibold text-slate-900">
                  {course.teacherNames.length > 1 ? "מורים: " : "מורה: "}
                </span>
                {course.teacherNames.join(", ")}
              </li>
            )}
            {course.startDate && (
              <li>
                <span className="font-semibold text-slate-900">תאריך התחלה: </span>
                {formatHebrewDate(course.startDate)}
              </li>
            )}
            {course.endDate && (
              <li>
                <span className="font-semibold text-slate-900">תאריך סיום: </span>
                {formatHebrewDate(course.endDate)}
              </li>
            )}
            {course.lessonsCount !== null && (
              <li>
                <span className="font-semibold text-slate-900">מספר מפגשים: </span>
                {course.lessonsCount}
              </li>
            )}
            {course.location && (
              <li>
                <span className="font-semibold text-slate-900">מיקום: </span>
                {course.location}
              </li>
            )}
          </ul>

          <div className="flex flex-wrap gap-2">
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
            {course.kind === "private_lessons" && (
              <Button asChild size="sm">
                <Link href={`/private-students/${course.itemId}` as Route}>
                  מחברת תלמיד
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4" aria-label="מפגשים">
        <h2 className="text-xl font-extrabold text-slate-900">מפגשים</h2>
        {meetingsError ? (
          <SectionError title="לא ניתן לטעון את המפגשים" message={meetingsError} />
        ) : (
          <MeetingList meetings={meetings ?? []} />
        )}
      </section>
    </div>
  );
}
