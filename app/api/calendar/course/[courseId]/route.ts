// GET /api/calendar/course/[courseId] — exports the real Monday meetings of a
// single course as a downloadable .ics file. Visibility rules mirror the
// portal pages: a user who may not see the course gets 404 (never 403, so the
// existence of other teachers' courses is not leaked).

import { NextResponse } from "next/server";

import { getPortalUserOrNull } from "@/lib/auth/guards";
import { getVisibleTeacherIds } from "@/lib/auth/roles";
import { buildIcsCalendar, type IcsEvent } from "@/lib/calendar/ics";
import { MondayApiError } from "@/lib/monday/client";
import { getPortalCourseById } from "@/lib/monday/courses";
import { getMeetingsForCourse } from "@/lib/monday/meetings";
import { PortalConfigurationError } from "@/lib/monday/portal-types";

export const dynamic = "force-dynamic";

const NOT_FOUND_RESPONSE = () =>
  NextResponse.json({ error: "הקורס המבוקש לא נמצא." }, { status: 404 });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;

  const user = await getPortalUserOrNull();

  if (!user) {
    return NextResponse.json(
      { error: "נדרשת התחברות כדי לייצא את יומן הקורס." },
      { status: 401 },
    );
  }

  const id = Number(courseId);

  if (!Number.isInteger(id) || id <= 0) {
    return NOT_FOUND_RESPONSE();
  }

  try {
    const course = await getPortalCourseById(id);

    if (!course) {
      return NOT_FOUND_RESPONSE();
    }

    const visible = getVisibleTeacherIds(user);

    if (visible && !course.teacherItemIds.some((teacherId) => visible.includes(teacherId))) {
      // 404, not 403 — never confirm the existence of unauthorized courses.
      return NOT_FOUND_RESPONSE();
    }

    const meetings = await getMeetingsForCourse(id);

    const events: IcsEvent[] = meetings
      .filter((meeting) => meeting.date !== null)
      .map((meeting) => ({
        uid: `meeting-${meeting.itemId}@madrasa-portal`,
        title: `${course.name} — מפגש`,
        description: meeting.zoomLink ? `קישור זום: ${meeting.zoomLink}` : undefined,
        location: meeting.location ?? meeting.zoomLink ?? undefined,
        date: meeting.date as string,
        startTime: meeting.startTime,
        durationMinutes: meeting.durationMinutes,
      }));

    return new NextResponse(buildIcsCalendar(events), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="course-${id}.ics"`,
      },
    });
  } catch (error) {
    if (error instanceof PortalConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof MondayApiError) {
      return NextResponse.json(
        { error: "שגיאה בתקשורת מול מאנדיי — נסו שוב בעוד מספר דקות." },
        { status: 502 },
      );
    }

    throw error;
  }
}
