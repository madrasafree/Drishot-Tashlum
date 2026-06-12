import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ATTENDANCE_STATUS_LABELS,
  CHIP_BASE_CLASS,
  formatMeetingDateTime,
  meetingStatusChipClass,
} from "@/components/portal/labels";
import { getPortalErrorMessage, SectionError } from "@/components/portal/section-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePortalUser } from "@/lib/auth/guards";
import { getVisibleTeacherIds } from "@/lib/auth/roles";
import { getAttendanceForMeeting } from "@/lib/monday/attendance";
import { getMeetingById, getMeetingStudents } from "@/lib/monday/meetings";
import type { AttendanceEntry, MeetingStudent } from "@/lib/monday/portal-types";

import { AttendanceForm } from "./attendance-form";

export const dynamic = "force-dynamic";

function SubmittedAttendance({ entries }: { entries: AttendanceEntry[] }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        נוכחות כבר הוגשה למפגש זה.
      </div>
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li
            key={entry.studentId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-100 bg-white/85 px-4 py-2 text-sm"
          >
            <span className="font-medium text-slate-900">{entry.studentName}</span>
            <span className="text-slate-600">
              {ATTENDANCE_STATUS_LABELS[entry.status]}
              {entry.note ? ` · ${entry.note}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const user = await requirePortalUser();
  const { meetingId } = await params;
  const meetingItemId = Number(meetingId);

  if (!Number.isInteger(meetingItemId) || meetingItemId <= 0) {
    notFound();
  }

  let meeting;
  try {
    meeting = await getMeetingById(meetingItemId);
  } catch (error) {
    return (
      <SectionError
        title="לא ניתן לטעון את המפגש"
        message={getPortalErrorMessage(error)}
      />
    );
  }

  if (!meeting) {
    notFound();
  }

  const visibleTeacherIds = getVisibleTeacherIds(user);
  if (
    visibleTeacherIds &&
    !meeting.teacherItemIds.some((id) => visibleTeacherIds.includes(id))
  ) {
    notFound();
  }

  const canSubmit = meeting.teacherItemIds.includes(user.teacherItemId);

  let students: MeetingStudent[] = [];
  let studentsError: string | null = null;
  try {
    students = await getMeetingStudents(meetingItemId);
  } catch (error) {
    studentsError = getPortalErrorMessage(error);
  }

  let existingAttendance: AttendanceEntry[] | null = null;
  try {
    existingAttendance = await getAttendanceForMeeting(meetingItemId);
  } catch {
    existingAttendance = null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>נוכחות — {meeting.courseName || meeting.name}</CardTitle>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span>{formatMeetingDateTime(meeting.date, meeting.startTime)}</span>
            <span className={`${CHIP_BASE_CLASS} ${meetingStatusChipClass(meeting.status)}`}>
              {meeting.statusLabel || meeting.status}
            </span>
            {meeting.location ? <span>{meeting.location}</span> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {existingAttendance?.length ? (
            <SubmittedAttendance entries={existingAttendance} />
          ) : !canSubmit ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              רק המורה של השיעור יכול להגיש נוכחות. ניתן לצפות בפרטי המפגש בלבד.
            </div>
          ) : studentsError ? (
            <SectionError title="לא ניתן לטעון את רשימת התלמידים" message={studentsError} />
          ) : !students.length ? (
            <p className="text-sm text-slate-600">לא נמצאו תלמידים למפגש זה.</p>
          ) : (
            <AttendanceForm meetingItemId={meeting.itemId} students={students} />
          )}

          <div className="flex justify-start">
            <Button asChild variant="outline">
              <Link href={`/meetings/${meeting.itemId}`}>חזרה לפרטי המפגש</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
