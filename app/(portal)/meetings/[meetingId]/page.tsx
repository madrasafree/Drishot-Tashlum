// Meeting detail: meeting info + students. The attendance button is shown
// only to the meeting's own teacher (mentors/managers are view-only).

import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CHIP_BASE_CLASS,
  formatMeetingDateTime,
  meetingStatusChipClass,
} from "@/components/portal/labels";
import { getPortalErrorMessage, SectionError } from "@/components/portal/section-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePortalUser } from "@/lib/auth/guards";
import { getVisibleTeacherIds } from "@/lib/auth/roles";
import { getMeetingById, getMeetingStudents } from "@/lib/monday/meetings";
import { PortalConfigurationError, type MeetingStudent, type PortalMeeting } from "@/lib/monday/portal-types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  const meetingItemId = Number(meetingId);

  if (!Number.isInteger(meetingItemId) || meetingItemId <= 0) {
    notFound();
  }

  const user = await requirePortalUser();

  let meeting: PortalMeeting | null = null;
  let meetingConfigError: string | null = null;
  try {
    meeting = await getMeetingById(meetingItemId);
  } catch (error) {
    if (!(error instanceof PortalConfigurationError)) {
      throw error;
    }
    meetingConfigError = error.message;
  }

  if (meetingConfigError) {
    return (
      <SectionError title="לוח המפגשים אינו מוגדר עדיין" message={meetingConfigError} />
    );
  }

  if (!meeting) {
    notFound();
  }

  const visible = getVisibleTeacherIds(user);
  if (visible && !meeting.teacherItemIds.some((id) => visible.includes(id))) {
    notFound();
  }

  const isMeetingTeacher = meeting.teacherItemIds.includes(user.teacherItemId);

  let students: MeetingStudent[] | null = null;
  let studentsError: string | null = null;
  try {
    students = await getMeetingStudents(meetingItemId);
  } catch (error) {
    studentsError = getPortalErrorMessage(error);
  }

  return (
    <div className="space-y-6">
      {meeting.courseItemId && (
        <div>
          <Link
            href={`/courses/${meeting.courseItemId}`}
            className="text-sm font-semibold text-[var(--madrasa-blue-dark)] underline underline-offset-4"
          >
            → חזרה לקורס{meeting.courseName ? ` ${meeting.courseName}` : ""}
          </Link>
        </div>
      )}

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {meeting.statusLabel && (
              <span className={cn(CHIP_BASE_CLASS, meetingStatusChipClass(meeting.status))}>
                {meeting.statusLabel}
              </span>
            )}
            {meeting.attendanceSubmitted && (
              <span
                className={cn(
                  CHIP_BASE_CLASS,
                  "border-[var(--madrasa-green)]/30 bg-lime-50 text-[var(--madrasa-green-dark)]",
                )}
              >
                נוכחות הוגשה
              </span>
            )}
          </div>
          <CardTitle>{meeting.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <li>
              <span className="font-semibold text-slate-900">מועד: </span>
              {formatMeetingDateTime(meeting.date, meeting.startTime)}
            </li>
            {meeting.durationMinutes !== null && (
              <li>
                <span className="font-semibold text-slate-900">משך: </span>
                {meeting.durationMinutes} דקות
              </li>
            )}
            {meeting.courseName && (
              <li>
                <span className="font-semibold text-slate-900">קורס: </span>
                {meeting.courseName}
              </li>
            )}
            {meeting.location && (
              <li>
                <span className="font-semibold text-slate-900">מיקום: </span>
                {meeting.location}
              </li>
            )}
          </ul>

          <div className="flex flex-wrap gap-2">
            {isMeetingTeacher && (
              <Button asChild size="sm">
                <Link href={`/attendance/${meeting.itemId}`}>מילוי נוכחות</Link>
              </Button>
            )}
            {meeting.zoomLink && (
              <Button asChild size="sm" variant="outline">
                <a href={meeting.zoomLink} target="_blank" rel="noopener noreferrer">
                  קישור זום
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4" aria-label="תלמידים">
        <h2 className="text-xl font-extrabold text-slate-900">תלמידים</h2>
        {studentsError ? (
          <SectionError title="לא ניתן לטעון את רשימת התלמידים" message={studentsError} />
        ) : students && students.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {students.map((student) => (
              <li
                key={student.id}
                className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm"
              >
                {student.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-white/80 bg-white/70 p-6 text-sm text-slate-500">
            לא נמצאו תלמידים למפגש זה.
          </p>
        )}
      </section>
    </div>
  );
}
