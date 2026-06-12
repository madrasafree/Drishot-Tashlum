// Route guards for portal pages, server actions, and API routes.
// Server-side only.

import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { resolveCurrentUser } from "@/lib/auth/current-user";
import { canViewTeacherData } from "@/lib/auth/roles";
import type {
  CurrentUser,
  CurrentUserFailureReason,
  PortalRole,
} from "@/lib/monday/portal-types";

function redirectTargetFor(reason: CurrentUserFailureReason): string {
  switch (reason) {
    case "pending":
      return "/pending";
    case "blocked":
    case "inactive":
      return "/blocked";
    default:
      return `/unauthorized?reason=${reason}`;
  }
}

/**
 * Resolves the current user or redirects to the matching state page.
 * Use in every portal layout/page/server action.
 */
export async function requirePortalUser(): Promise<CurrentUser> {
  const result = await resolveCurrentUser();

  if (!result.ok) {
    redirect(redirectTargetFor(result.reason) as Route);
  }

  return result.user;
}

export async function requireRole(...roles: PortalRole[]): Promise<CurrentUser> {
  const user = await requirePortalUser();

  if (!roles.includes(user.role)) {
    redirect("/unauthorized?reason=forbidden" as Route);
  }

  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  return requireRole("admin");
}

/**
 * 404 (not 403) when the user may not see this teacher's data, so the
 * existence of other teachers' resources is never confirmed.
 */
export function assertCanViewTeacher(user: CurrentUser, teacherItemId: number): void {
  if (!canViewTeacherData(user, teacherItemId)) {
    notFound();
  }
}

/** Guard variant for API routes / server actions that must not redirect. */
export async function getPortalUserOrNull(): Promise<CurrentUser | null> {
  const result = await resolveCurrentUser();
  return result.ok ? result.user : null;
}
