// Upcoming-meeting card for the dashboard.

import Link from "next/link";

import {
  CHIP_BASE_CLASS,
  formatMeetingDateTime,
  meetingStatusChipClass,
} from "@/components/portal/labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortalMeeting } from "@/lib/monday/portal-types";
import { cn } from "@/lib/utils";

export function MeetingCard({ meeting }: { meeting: PortalMeeting }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="gap-3 pb-3">
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
        <CardTitle className="text-lg leading-7">
          {meeting.courseName ?? meeting.name}
        </CardTitle>
        <p className="text-sm font-semibold text-slate-700">
          {formatMeetingDateTime(meeting.date, meeting.startTime)}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {meeting.location && (
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">מיקום: </span>
            {meeting.location}
          </p>
        )}
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <Button asChild size="sm">
            <Link href={`/attendance/${meeting.itemId}`}>נוכחות</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/meetings/${meeting.itemId}`}>פרטים</Link>
          </Button>
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
  );
}
