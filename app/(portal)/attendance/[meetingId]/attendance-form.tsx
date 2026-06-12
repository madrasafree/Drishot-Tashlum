"use client";

import { useActionState } from "react";

import { ATTENDANCE_STATUS_OPTIONS } from "@/components/portal/labels";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MeetingStudent } from "@/lib/monday/portal-types";

import { submitAttendanceAction, type AttendanceFormState } from "./actions";

export function AttendanceForm({
  meetingItemId,
  students,
}: {
  meetingItemId: number;
  students: MeetingStudent[];
}) {
  const [state, formAction, isPending] = useActionState<AttendanceFormState | null, FormData>(
    submitAttendanceAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="meetingItemId" value={meetingItemId} />

      <ul className="space-y-3">
        {students.map((student) => (
          <li
            key={student.id}
            className="grid items-center gap-3 rounded-xl border border-sky-100 bg-white/85 px-4 py-3 sm:grid-cols-[1fr_auto_1fr]"
          >
            <span className="font-medium text-slate-900">{student.name}</span>
            <select
              name={`status-${student.id}`}
              defaultValue="present"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              aria-label={`סטטוס נוכחות עבור ${student.name}`}
            >
              {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Input
              name={`note-${student.id}`}
              placeholder="הערה (לא חובה)"
              className="h-10"
            />
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <Label htmlFor="generalNote">הערה כללית למפגש</Label>
        <Textarea id="generalNote" name="generalNote" rows={3} placeholder="לא חובה" />
      </div>

      {state ? (
        <Alert variant={state.ok ? "default" : "destructive"}>
          <AlertTitle>{state.ok ? "הנוכחות נשלחה" : "שליחת הנוכחות נכשלה"}</AlertTitle>
          <AlertDescription>
            {state.message}
            {state.ok && state.storedInMonday === false
              ? " (מצב תצוגה מקדימה — הנתונים לא נשמרו במאנדיי)"
              : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "שולח..." : "שליחת נוכחות"}
        </Button>
      </div>
    </form>
  );
}
