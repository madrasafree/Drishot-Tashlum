"use client";

import { useActionState } from "react";

import { formatHebrewDateShort } from "@/components/portal/labels";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PrivateNotebookMeetingSummary } from "@/lib/monday/portal-types";

import {
  updateCourseNotebookAction,
  updateMeetingNotebookAction,
  type NotebookFormState,
} from "./actions";

function ResultAlert({ state }: { state: NotebookFormState | null }) {
  if (!state) {
    return null;
  }

  return (
    <Alert variant={state.ok ? "default" : "destructive"}>
      <AlertDescription>
        {state.message}
        {state.ok && state.storedInMonday === false
          ? " (מצב תצוגה מקדימה — הנתונים לא נשמרו במאנדיי)"
          : null}
      </AlertDescription>
    </Alert>
  );
}

export function CourseNotebookForm({
  courseItemId,
  learningGoals,
  languageBackground,
  generalNotes,
}: {
  courseItemId: number;
  learningGoals: string;
  languageBackground: string;
  generalNotes: string;
}) {
  const [state, formAction, isPending] = useActionState<NotebookFormState | null, FormData>(
    updateCourseNotebookAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="courseItemId" value={courseItemId} />
      <div className="space-y-2">
        <Label htmlFor="learningGoals">מטרות למידה</Label>
        <Textarea id="learningGoals" name="learningGoals" rows={3} defaultValue={learningGoals} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="languageBackground">רקע שפתי</Label>
        <Textarea
          id="languageBackground"
          name="languageBackground"
          rows={3}
          defaultValue={languageBackground}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="generalNotes">הערות כלליות</Label>
        <Textarea id="generalNotes" name="generalNotes" rows={3} defaultValue={generalNotes} />
      </div>
      <ResultAlert state={state} />
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "שומר..." : "שמירת פרטי הקורס"}
        </Button>
      </div>
    </form>
  );
}

export function MeetingSummaryForm({
  courseItemId,
  summary,
}: {
  courseItemId: number;
  summary: PrivateNotebookMeetingSummary;
}) {
  const [state, formAction, isPending] = useActionState<NotebookFormState | null, FormData>(
    updateMeetingNotebookAction,
    null,
  );
  const idPrefix = `meeting-${summary.meetingItemId}`;

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-sky-100 bg-white/85 p-4"
    >
      <input type="hidden" name="courseItemId" value={courseItemId} />
      <input type="hidden" name="meetingItemId" value={summary.meetingItemId} />
      <p className="font-semibold text-slate-900">
        מפגש בתאריך {formatHebrewDateShort(summary.date)}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-topics`}>נושאים שנלמדו</Label>
          <Textarea
            id={`${idPrefix}-topics`}
            name="topicsCovered"
            rows={2}
            defaultValue={summary.topicsCovered}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-words`}>מילים וביטויים חדשים</Label>
          <Textarea
            id={`${idPrefix}-words`}
            name="newWordsPhrases"
            rows={2}
            defaultValue={summary.newWordsPhrases}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-homework`}>שיעורי בית</Label>
          <Textarea
            id={`${idPrefix}-homework`}
            name="homework"
            rows={2}
            defaultValue={summary.homework}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-notes`}>הערות מורה</Label>
          <Textarea
            id={`${idPrefix}-notes`}
            name="teacherNotes"
            rows={2}
            defaultValue={summary.teacherNotes}
          />
        </div>
      </div>
      <ResultAlert state={state} />
      <div className="flex justify-end">
        <Button type="submit" size="sm" variant="outline" disabled={isPending}>
          {isPending ? "שומר..." : "שמירת סיכום המפגש"}
        </Button>
      </div>
    </form>
  );
}
