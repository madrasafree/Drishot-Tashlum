import Link from "next/link";
import { notFound } from "next/navigation";

import { formatHebrewDateShort } from "@/components/portal/labels";
import { getPortalErrorMessage, SectionError } from "@/components/portal/section-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePortalUser } from "@/lib/auth/guards";
import { getVisibleTeacherIds } from "@/lib/auth/roles";
import { getPortalCourseById } from "@/lib/monday/courses";
import {
  getPrivateCourseNotebook,
  getPrivateLessonOwnerTeacherIds,
} from "@/lib/monday/private-lessons";

import { CourseNotebookForm, MeetingSummaryForm } from "./notebook-forms";

export const dynamic = "force-dynamic";

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <p className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {value || "—"}
      </p>
    </div>
  );
}

export default async function PrivateStudentNotebookPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await requirePortalUser();
  const { courseId } = await params;
  const courseItemId = Number(courseId);

  if (!Number.isInteger(courseItemId) || courseItemId <= 0) {
    notFound();
  }

  const course = await getPortalCourseById(courseItemId);
  if (!course || course.kind !== "private_lessons") {
    notFound();
  }

  let ownerIds: number[] = [];
  try {
    ownerIds = await getPrivateLessonOwnerTeacherIds(courseItemId);
  } catch (error) {
    return (
      <SectionError
        title="לא ניתן לטעון את פרטי הקורס"
        message={getPortalErrorMessage(error)}
      />
    );
  }

  const visibleTeacherIds = getVisibleTeacherIds(user);
  const effectiveOwnerIds = ownerIds.length ? ownerIds : course.teacherItemIds;
  if (
    visibleTeacherIds &&
    !effectiveOwnerIds.some((id) => visibleTeacherIds.includes(id))
  ) {
    notFound();
  }

  const canEdit =
    user.role === "admin" ||
    user.role === "training_manager" ||
    effectiveOwnerIds.includes(user.teacherItemId);

  let notebook;
  let notebookError: string | null = null;
  try {
    notebook = await getPrivateCourseNotebook(courseItemId);
  } catch (error) {
    notebookError = getPortalErrorMessage(error);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>מחברת תלמיד — {course.studentName || course.name}</CardTitle>
          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
            {notebook?.teacherName ? <span>מורה: {notebook.teacherName}</span> : null}
            <span>סטטוס: {course.state}</span>
            {course.lessonsCount !== null ? (
              <span>שיעורים שנרכשו: {course.lessonsCount}</span>
            ) : null}
          </div>
          {!canEdit ? (
            <p className="text-sm text-amber-700">
              צפייה בלבד — עריכה זמינה למורה של התלמיד ולצוות ההדרכה.
            </p>
          ) : null}
          {notebook && !notebook.storedInMonday ? (
            <p className="text-sm text-slate-500">
              שדות המחברת עדיין לא ממופים במאנדיי; הנתונים מוצגים במצב תצוגה
              מקדימה בלבד.
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-6">
          {notebookError ? (
            <SectionError title="לא ניתן לטעון את המחברת" message={notebookError} />
          ) : !notebook ? (
            <p className="text-sm text-slate-600">לא נמצאה מחברת לקורס זה.</p>
          ) : canEdit ? (
            <CourseNotebookForm
              courseItemId={courseItemId}
              learningGoals={notebook.learningGoals}
              languageBackground={notebook.languageBackground}
              generalNotes={notebook.generalNotes}
            />
          ) : (
            <div className="space-y-4">
              <ReadOnlyField label="מטרות למידה" value={notebook.learningGoals} />
              <ReadOnlyField label="רקע שפתי" value={notebook.languageBackground} />
              <ReadOnlyField label="הערות כלליות" value={notebook.generalNotes} />
            </div>
          )}
        </CardContent>
      </Card>

      {notebook ? (
        <Card>
          <CardHeader>
            <CardTitle>סיכומי מפגשים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!notebook.meetingSummaries.length ? (
              <p className="text-sm text-slate-600">
                אין עדיין סיכומי מפגשים לקורס זה.
              </p>
            ) : canEdit ? (
              notebook.meetingSummaries.map((summary) => (
                <MeetingSummaryForm
                  key={summary.meetingItemId}
                  courseItemId={courseItemId}
                  summary={summary}
                />
              ))
            ) : (
              notebook.meetingSummaries.map((summary) => (
                <div
                  key={summary.meetingItemId}
                  className="space-y-3 rounded-xl border border-sky-100 bg-white/85 p-4"
                >
                  <p className="font-semibold text-slate-900">
                    מפגש בתאריך {formatHebrewDateShort(summary.date)}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReadOnlyField label="נושאים שנלמדו" value={summary.topicsCovered} />
                    <ReadOnlyField label="מילים וביטויים חדשים" value={summary.newWordsPhrases} />
                    <ReadOnlyField label="שיעורי בית" value={summary.homework} />
                    <ReadOnlyField label="הערות מורה" value={summary.teacherNotes} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      <div>
        <Button asChild variant="outline">
          <Link href={`/courses/${courseItemId}`}>חזרה לפרטי הקורס</Link>
        </Button>
      </div>
    </div>
  );
}
