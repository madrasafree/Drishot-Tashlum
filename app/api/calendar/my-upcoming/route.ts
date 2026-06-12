// GET /api/calendar/my-upcoming — exports the authenticated teacher's
// upcoming real Monday meetings (up to 50) as a downloadable .ics file.

import { NextResponse } from "next/server";

import { getPortalUserOrNull } from "@/lib/auth/guards";
import { buildIcsCalendar, type IcsEvent } from "@/lib/calendar/ics";
import { MondayApiError } from "@/lib/monday/client";
import { getUpcomingMeetingsForTeacher } from "@/lib/monday/meetings";
import { PortalConfigurationError } from "@/lib/monday/portal-types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getPortalUserOrNull();

  if (!user) {
    return NextResponse.json(
      { error: "נדרשת התחברות כדי לייצא את יומן המפגשים." },
      { status: 401 },
    );
  }

  try {
    const meetings = await getUpcomingMeetingsForTeacher(user.teacherItemId, 50);

    const events: IcsEvent[] = meetings
      .filter((meeting) => meeting.date !== null)
      .map((meeting) => ({
        uid: `meeting-${meeting.itemId}@madrasa-portal`,
        title: meeting.courseName ?? meeting.name,
        description: meeting.zoomLink ? `קישור זום: ${meeting.zoomLink}` : undefined,
        location: meeting.location ?? meeting.zoomLink ?? undefined,
        date: meeting.date as string,
        startTime: meeting.startTime,
        durationMinutes: meeting.durationMinutes,
      }));

    return new NextResponse(buildIcsCalendar(events), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="my-upcoming.ics"',
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
