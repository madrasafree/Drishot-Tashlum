"use server";

import { revalidatePath } from "next/cache";

import { requirePortalUser } from "@/lib/auth/guards";
import { submitAttendance } from "@/lib/monday/attendance";
import { getMeetingById, getMeetingStudents } from "@/lib/monday/meetings";
import {
  PortalConfigurationError,
  type AttendanceEntry,
  type AttendanceStatus,
} from "@/lib/monday/portal-types";
import { getPortalErrorMessage } from "@/components/portal/section-error";

export interface AttendanceFormState {
  ok: boolean;
  message: string;
  storedInMonday?: boolean;
}

const VALID_STATUSES: AttendanceStatus[] = [
  "present",
  "absent",
  "late",
  "excused",
  "cancelled",
];

function parseStatus(value: FormDataEntryValue | null): AttendanceStatus {
  const status = String(value || "present") as AttendanceStatus;
  return VALID_STATUSES.includes(status) ? status : "present";
}

export async function submitAttendanceAction(
  _prevState: AttendanceFormState | null,
  formData: FormData,
): Promise<AttendanceFormState> {
  // Never trust the client: re-resolve the user and re-verify ownership here.
  const user = await requirePortalUser();
  const meetingItemId = Number(formData.get("meetingItemId"));

  if (!Number.isInteger(meetingItemId) || meetingItemId <= 0) {
    return { ok: false, message: "מזהה מפגש לא תקין." };
  }

  try {
    const meeting = await getMeetingById(meetingItemId);

    if (!meeting) {
      return { ok: false, message: "המפגש לא נמצא." };
    }

    if (!meeting.teacherItemIds.includes(user.teacherItemId)) {
      return { ok: false, message: "רק המורה של השיעור יכול להגיש נוכחות." };
    }

    // Student list comes from the server, not from hidden form fields.
    const students = await getMeetingStudents(meetingItemId);
    const entries: AttendanceEntry[] = students.map((student) => ({
      studentId: student.id,
      studentName: student.name,
      status: parseStatus(formData.get(`status-${student.id}`)),
      note: String(formData.get(`note-${student.id}`) || "").trim() || undefined,
    }));

    if (!entries.length) {
      return { ok: false, message: "לא נמצאו תלמידים למפגש זה." };
    }

    const result = await submitAttendance({
      meetingItemId,
      entries,
      generalNote: String(formData.get("generalNote") || "").trim() || undefined,
      submittedByTeacherItemId: user.teacherItemId,
    });

    revalidatePath(`/attendance/${meetingItemId}`);
    revalidatePath(`/meetings/${meetingItemId}`);

    return {
      ok: result.ok,
      message: result.message,
      storedInMonday: result.storedInMonday,
    };
  } catch (error) {
    if (error instanceof PortalConfigurationError) {
      return { ok: false, message: error.message };
    }

    return { ok: false, message: getPortalErrorMessage(error) };
  }
}
