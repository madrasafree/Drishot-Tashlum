// Courses index. Scope depends on role:
//   teacher           — own courses
//   mentor            — own + assigned teachers' courses
//   training_manager  — all courses (capped display)
//   admin             — all courses (capped display)
// ?teacherId=X narrows to one teacher after an explicit visibility check.

import { CourseCard } from "@/components/portal/course-card";
import { getPortalErrorMessage, SectionError } from "@/components/portal/section-error";
import { assertCanViewTeacher, requirePortalUser } from "@/lib/auth/guards";
import {
  getAllPortalCourses,
  getPortalCoursesForTeacher,
  getPortalCoursesForTeachers,
} from "@/lib/monday/courses";
import { getPortalTeacherByItemId } from "@/lib/monday/teachers";
import type { PortalCourse } from "@/lib/monday/portal-types";

export const dynamic = "force-dynamic";

const ALL_COURSES_DISPLAY_CAP = 100;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePortalUser();
  const params = await searchParams;
  const teacherIdParam = firstParam(params.teacherId);
  const teacherId = teacherIdParam ? Number(teacherIdParam) : null;

  let title = "הקורסים שלי";
  let subtitle: string | null = null;
  let courses: PortalCourse[] | null = null;
  let totalNote: string | null = null;
  let coursesError: string | null = null;
  let showTeachers = false;

  if (teacherId !== null && Number.isInteger(teacherId) && teacherId > 0) {
    // Explicit teacher filter — 404s when the user may not see this teacher.
    assertCanViewTeacher(user, teacherId);

    try {
      const [teacher, teacherCourses] = await Promise.all([
        getPortalTeacherByItemId(teacherId),
        getPortalCoursesForTeacher(teacherId),
      ]);

      title = `הקורסים של ${teacher?.name ?? `מורה #${teacherId}`}`;
      courses = teacherCourses;
    } catch (error) {
      title = `הקורסים של מורה #${teacherId}`;
      coursesError = getPortalErrorMessage(error);
    }
  } else if (user.role === "mentor") {
    title = "הקורסים שלי ושל המורים שלי";
    subtitle = "כולל את הקורסים של המורים המלווים על ידך.";
    showTeachers = true;

    try {
      courses = await getPortalCoursesForTeachers([
        user.teacherItemId,
        ...user.mentorTeacherIds,
      ]);
    } catch (error) {
      coursesError = getPortalErrorMessage(error);
    }
  } else if (user.role === "training_manager" || user.role === "admin") {
    title = "כל הקורסים";
    showTeachers = true;

    try {
      const allCourses = await getAllPortalCourses();
      courses = allCourses.slice(0, ALL_COURSES_DISPLAY_CAP);

      if (allCourses.length > ALL_COURSES_DISPLAY_CAP) {
        totalNote = `מוצגים ${ALL_COURSES_DISPLAY_CAP} קורסים מתוך ${allCourses.length} בסך הכול.`;
      } else {
        totalNote = `סך הכול ${allCourses.length} קורסים.`;
      }
    } catch (error) {
      coursesError = getPortalErrorMessage(error);
    }
  } else {
    try {
      courses = await getPortalCoursesForTeacher(user.teacherItemId);
    } catch (error) {
      coursesError = getPortalErrorMessage(error);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-950 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        {totalNote && <p className="mt-1 text-sm font-semibold text-slate-600">{totalNote}</p>}
      </div>

      {coursesError ? (
        <SectionError title="לא ניתן לטעון את הקורסים" message={coursesError} />
      ) : courses && courses.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.itemId} course={course} showTeachers={showTeachers} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-white/80 bg-white/70 p-6 text-sm text-slate-500">
          אין קורסים להצגה.
        </p>
      )}
    </div>
  );
}
