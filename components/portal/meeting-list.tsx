// Compact meeting rows for the course-detail page.

import Link from "next/link";

import {
  CHIP_BASE_CLASS,
  formatMeetingDateTime,
  meetingStatusChipClass,
} from "@/components/portal/labels";
import { Button } from "@/components/ui/button";
import type { PortalMeeting } from "@/lib/monday/portal-types";
import { cn } from "@/lib/utils";

export function MeetingList({ meetings }: { meetings: PortalMeeting[] }) {
  if (!meetings.length) {
    return <p className="text-sm text-slate-500">אין מפגשים לקורס זה.</p>;
  }

  return (
    <ul className="space-y-3">
      {meetings.map((meeting) => (
        <li
          key={meeting.itemId}
          className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-col gap-2">
            <p className="font-bold text-slate-900">{meeting.name}</p>
            <p className="text-sm text-slate-600">
              {formatMeetingDateTime(meeting.date, meeting.startTime)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {meeting.statusLabel && (
                <span
                  className={cn(CHIP_BASE_CLASS, meetingStatusChipClass(meeting.status))}
                >
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
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/meetings/${meeting.itemId}`}>פרטים</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/attendance/${meeting.itemId}`}>נוכחות</Link>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
