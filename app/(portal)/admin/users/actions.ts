"use server";

// Server actions for /admin/users — approve / block a teacher's portal
// access by writing the mapped status column on the Teachers board.
// Authorization is re-checked inside every action.

import { revalidatePath } from "next/cache";

import { isPortalPreviewAuth } from "@/lib/auth/current-user";
import { requireAdmin } from "@/lib/auth/guards";
import { fetchMutation, MondayApiError } from "@/lib/monday/client";
import { BOARD_IDS } from "@/lib/monday/constants";
import { TEACHER_PORTAL_COLUMNS } from "@/lib/monday/portal-mappings";

export interface AccessActionResult {
  ok: boolean;
  message: string;
}

const ACCESS_LABELS = {
  approve: "מאושר",
  block: "חסום",
} as const;

type AccessDecision = keyof typeof ACCESS_LABELS;

async function setTeacherAccessStatus(
  teacherItemId: number,
  decision: AccessDecision,
): Promise<AccessActionResult> {
  await requireAdmin();

  if (!Number.isInteger(teacherItemId) || teacherItemId <= 0) {
    return { ok: false, message: "מזהה המורה אינו תקין." };
  }

  if (isPortalPreviewAuth()) {
    return { ok: true, message: "מצב תצוגה מקדימה — הפעולה לא נשמרת" };
  }

  const columnId = TEACHER_PORTAL_COLUMNS.APP_ACCESS_STATUS;

  if (!columnId) {
    return {
      ok: false,
      message:
        "עמודת הרשאות הגישה (TEACHERS.APP_ACCESS_STATUS) עדיין לא ממופה במאנדיי — לא ניתן לעדכן סטטוס גישה.",
    };
  }

  try {
    await fetchMutation(
      `mutation SetTeacherAppAccessStatus($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(
          board_id: $boardId
          item_id: $itemId
          column_values: $columnValues
        ) {
          id
        }
      }`,
      {
        boardId: String(BOARD_IDS.TEACHERS),
        itemId: String(teacherItemId),
        columnValues: JSON.stringify({ [columnId]: { label: ACCESS_LABELS[decision] } }),
      },
    );
  } catch (error) {
    if (error instanceof MondayApiError) {
      return { ok: false, message: `שגיאה מול מאנדיי: ${error.message}` };
    }

    return { ok: false, message: "שגיאה לא צפויה בעדכון סטטוס הגישה." };
  }

  revalidatePath("/admin/users");

  return {
    ok: true,
    message: decision === "approve" ? "הגישה אושרה." : "הגישה נחסמה.",
  };
}

/** useActionState-compatible action: reads teacherItemId + decision from the form. */
export async function setAccessStatusAction(
  _previous: AccessActionResult | null,
  formData: FormData,
): Promise<AccessActionResult> {
  const teacherItemId = Number(formData.get("teacherItemId"));
  const decision = formData.get("decision");

  if (decision !== "approve" && decision !== "block") {
    return { ok: false, message: "פעולה לא מוכרת." };
  }

  return setTeacherAccessStatus(teacherItemId, decision);
}
