// Role resolution and permission helpers. Server-side only.
//
// Role precedence:
//   1. Env allowlists (PORTAL_ADMIN_EMAILS, PORTAL_TRAINING_MANAGER_EMAILS) —
//      the bridge until a Monday "app role" column is mapped.
//   2. The Monday app-role column (TEACHER_PORTAL_COLUMNS.APP_ROLE) if mapped.
//   3. Default: teacher.

import type { CurrentUser, PortalRole, PortalTeacher } from "@/lib/monday/portal-types";
import { getRuntimeEnv } from "@/lib/runtime-env";

function parseEmailAllowlist(envName: string): Set<string> {
  const raw = getRuntimeEnv(envName) || "";

  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function resolveRole(teacher: PortalTeacher): PortalRole {
  const email = teacher.email.toLowerCase();

  if (parseEmailAllowlist("PORTAL_ADMIN_EMAILS").has(email)) {
    return "admin";
  }

  if (parseEmailAllowlist("PORTAL_TRAINING_MANAGER_EMAILS").has(email)) {
    return "training_manager";
  }

  return teacher.role ?? "teacher";
}

export function isAdmin(user: CurrentUser): boolean {
  return user.role === "admin";
}

export function canSeeAllTeachers(user: CurrentUser): boolean {
  return user.role === "admin" || user.role === "training_manager";
}

/** Server-side data-visibility check. Client-side filtering is never enough. */
export function canViewTeacherData(user: CurrentUser, teacherItemId: number): boolean {
  if (canSeeAllTeachers(user)) {
    return true;
  }

  if (user.role === "mentor") {
    return (
      teacherItemId === user.teacherItemId || user.mentorTeacherIds.includes(teacherItemId)
    );
  }

  return teacherItemId === user.teacherItemId;
}

/** Only the teacher themself may submit attendance / payment requests. */
export function canSubmitAsTeacher(user: CurrentUser, teacherItemId: number): boolean {
  return teacherItemId === user.teacherItemId;
}

/** The teacher item ids whose data this user may read. null = unrestricted. */
export function getVisibleTeacherIds(user: CurrentUser): number[] | null {
  if (canSeeAllTeachers(user)) {
    return null;
  }

  if (user.role === "mentor") {
    return [user.teacherItemId, ...user.mentorTeacherIds];
  }

  return [user.teacherItemId];
}
