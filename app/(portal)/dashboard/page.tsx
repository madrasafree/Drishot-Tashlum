// Portal dashboard: my courses, my upcoming meetings, and role-specific
// sections. Every Monday-backed section is individually guarded so a missing
// mapping or Monday error never crashes the page.

import type { Route } from "next";
import Link from "next/link";

import { CourseCard } from "@/components/portal/course-card";
import { MeetingCard } from "@/components/portal/meeting-card";
import { getPortalErrorMessage, SectionError } from "@/components/portal/section-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canSeeAllTeachers } from "@/lib/auth/roles";
import { requirePortalUser } from "@/lib/auth/guards";
import { getPortalCoursesForTeacher } from "@/lib/monday/courses";
import { getUpcomingMeetingsForTeacher } from "@/lib/monday/meetings";
import { getTeachersForMentor } from "@/lib/monday/teachers";
import type {
  PortalCourse,
  PortalMeeting,
  PortalTeacher,
} from "@/lib/monday/portal-types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requirePortalUser();

  let courses: PortalCourse[] | null = null;
  let coursesError: string | null = null;
  try {
    courses = await getPortalCoursesForTeacher(user.teacherItemId);
  } catch (error) {
    coursesError = getPortalErrorMessage(error);
  }

  let upcomingMeetings: PortalMeeting[] | null = null;
  let meetingsError: string | null = null;
  try {
    upcomingMeetings = await getUpcomingMeetingsForTeacher(user.teacherItemId, 10);
  } catch (error) {
    meetingsError = getPortalErrorMessage(error);
  }

  let mentorTeachers: PortalTeacher[] | null = null;
  let mentorError: string | null = null;
  if (user.role === "mentor") {
    try {
      mentorTeachers = await getTeachersForMentor(user.teacherItemId);
    } catch (error) {
      mentorError = getPortalErrorMessage(error);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-950 sm:text-3xl">
          שלום, {user.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          כאן אפשר לראות את הקורסים, השיעורים הקרובים ולהגיש נוכחות.
        </p>
      </div>

      <section className="space-y-4" aria-label="הקורסים שלי">
        <h2 className="text-xl font-extrabold text-slate-900">הקורסים שלי</h2>
        {coursesError ? (
          <SectionError title="לא ניתן לטעון את הקורסים" message={coursesError} />
        ) : courses && courses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.itemId} course={course} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-white/80 bg-white/70 p-6 text-sm text-slate-500">
            אין קורסים להצגה כרגע.
          </p>
        )}
      </section>

      <section className="space-y-4" aria-label="השיעורים הקרובים שלי">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-slate-900">השיעורים הקרובים שלי</h2>
          <Button asChild size="sm" variant="outline">
            <a href="/api/calendar/my-upcoming">יצוא כל השיעורים הקרובים ליומן</a>
          </Button>
        </div>
        {meetingsError ? (
          <SectionError title="לא ניתן לטעון את השיעורים הקרובים" message={meetingsError} />
        ) : upcomingMeetings && upcomingMeetings.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {upcomingMeetings.map((meeting) => (
              <MeetingCard key={meeting.itemId} meeting={meeting} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-white/80 bg-white/70 p-6 text-sm text-slate-500">
            אין שיעורים קרובים מתוכננים.
          </p>
        )}
      </section>

      {user.role === "mentor" && (
        <section className="space-y-4" aria-label="המורים שלי">
          <h2 className="text-xl font-extrabold text-slate-900">המורים שלי</h2>
          {mentorError ? (
            <SectionError title="לא ניתן לטעון את רשימת המורים" message={mentorError} />
          ) : mentorTeachers && mentorTeachers.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {mentorTeachers.map((teacher) => (
                <Card key={teacher.itemId}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{teacher.name}</CardTitle>
                    {teacher.email && (
                      <p className="text-sm text-slate-500" dir="ltr">
                        {teacher.email}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/courses?teacherId=${teacher.itemId}` as Route}>
                        הקורסים של {teacher.name}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-white/80 bg-white/70 p-6 text-sm text-slate-500">
              עדיין לא שויכו אליך מורים.
            </p>
          )}
        </section>
      )}

      {canSeeAllTeachers(user) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">כל הקורסים בעמותה</CardTitle>
            <p className="text-sm text-slate-600">
              בתפקידך אפשר לצפות בקורסים של כל המורים הפעילים.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link href="/courses">לצפייה בכל הקורסים</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
