"use server";

import { revalidatePath } from "next/cache";

import { getPortalErrorMessage } from "@/components/portal/section-error";
import { requirePortalUser } from "@/lib/auth/guards";
import {
  getPrivateLessonOwnerTeacherIds,
  updateMeetingNotebook,
  updatePrivateCourseNotebook,
} from "@/lib/monday/private-lessons";
import { PortalConfigurationError, type CurrentUser } from "@/lib/monday/portal-types";

export interface NotebookFormState {
  ok: boolean;
  message: string;
  storedInMonday?: boolean;
}

async function canEditNotebook(user: CurrentUser, courseItemId: number): Promise<boolean> {
  if (user.role === "admin" || user.role === "training_manager") {
    return true;
  }

  const ownerIds = await getPrivateLessonOwnerTeacherIds(courseItemId);
  return ownerIds.includes(user.teacherItemId);
}

export async function updateCourseNotebookAction(
  _prevState: NotebookFormState | null,
  formData: FormData,
): Promise<NotebookFormState> {
  const user = await requirePortalUser();
  const courseItemId = Number(formData.get("courseItemId"));

  if (!Number.isInteger(courseItemId) || courseItemId <= 0) {
    return { ok: false, message: "מזהה קורס לא תקין." };
  }

  try {
    if (!(await canEditNotebook(user, courseItemId))) {
      return { ok: false, message: "אין לך הרשאה לערוך את המחברת של קורס זה." };
    }

    const result = await updatePrivateCourseNotebook(courseItemId, {
      learningGoals: String(formData.get("learningGoals") || ""),
      languageBackground: String(formData.get("languageBackground") || ""),
      generalNotes: String(formData.get("generalNotes") || ""),
    });

    revalidatePath(`/private-students/${courseItemId}`);
    return { ok: result.ok, message: result.message, storedInMonday: result.storedInMonday };
  } catch (error) {
    if (error instanceof PortalConfigurationError) {
      return {
        ok: false,
        message: `עמודות המחברת עדיין לא הוגדרו במאנדיי — ראו ניהול > מיפויים. ${error.message}`,
      };
    }

    return { ok: false, message: getPortalErrorMessage(error) };
  }
}

export async function updateMeetingNotebookAction(
  _prevState: NotebookFormState | null,
  formData: FormData,
): Promise<NotebookFormState> {
  const user = await requirePortalUser();
  const courseItemId = Number(formData.get("courseItemId"));
  const meetingItemId = Number(formData.get("meetingItemId"));

  if (
    !Number.isInteger(courseItemId) ||
    courseItemId <= 0 ||
    !Number.isInteger(meetingItemId) ||
    meetingItemId <= 0
  ) {
    return { ok: false, message: "מזהה מפגש או קורס לא תקין." };
  }

  try {
    if (!(await canEditNotebook(user, courseItemId))) {
      return { ok: false, message: "אין לך הרשאה לערוך את המחברת של קורס זה." };
    }

    const result = await updateMeetingNotebook(meetingItemId, {
      topicsCovered: String(formData.get("topicsCovered") || ""),
      newWordsPhrases: String(formData.get("newWordsPhrases") || ""),
      homework: String(formData.get("homework") || ""),
      teacherNotes: String(formData.get("teacherNotes") || ""),
    });

    revalidatePath(`/private-students/${courseItemId}`);
    return { ok: result.ok, message: result.message, storedInMonday: result.storedInMonday };
  } catch (error) {
    if (error instanceof PortalConfigurationError) {
      return {
        ok: false,
        message: `עמודות המחברת עדיין לא הוגדרו במאנדיי — ראו ניהול > מיפויים. ${error.message}`,
      };
    }

    return { ok: false, message: getPortalErrorMessage(error) };
  }
}
