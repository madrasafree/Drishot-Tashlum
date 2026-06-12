// Current-user resolution for the Teacher Portal. Server-side only.
//
// Identity flow:
//   cloudflare mode — email from the Cloudflare Access header, looked up in
//     the Monday Teachers board. The Monday item_id is the canonical identity.
//   preview mode — simulated identity from a preview cookie / env vars,
//     resolved against mock teachers. Preview identity is only honored when
//     AUTH_MODE=preview or no MONDAY_API_TOKEN exists, so it can never weaken
//     a real deployment that has a token and Cloudflare Access in front.

import { cache } from "react";
import { cookies } from "next/headers";

import { getCloudflareAccessEmail } from "@/lib/auth/cloudflare";
import { resolveRole } from "@/lib/auth/roles";
import { MondayApiError } from "@/lib/monday/client";
import { isMondayPreviewMode } from "@/lib/monday/mock";
import { getPortalTeachersByEmail, getTeachersForMentor } from "@/lib/monday/teachers";
import {
  PortalConfigurationError,
  type CurrentUser,
  type CurrentUserResult,
  type PortalTeacher,
} from "@/lib/monday/portal-types";
import { getRuntimeEnv } from "@/lib/runtime-env";

export const PREVIEW_EMAIL_COOKIE = "portal-preview-email";
const DEFAULT_PREVIEW_EMAIL = "yael@example.com";

export type AuthMode = "cloudflare" | "preview";

export function getAuthMode(): AuthMode {
  const configured = getRuntimeEnv("AUTH_MODE")?.trim().toLowerCase();

  if (configured === "preview") {
    return "preview";
  }

  if (configured === "cloudflare") {
    return "cloudflare";
  }

  // No explicit mode: only fall back to preview when there is no Monday
  // token at all (pure local/demo runs). Anything with a real token must
  // authenticate through Cloudflare Access.
  return isMondayPreviewMode() ? "preview" : "cloudflare";
}

async function getPreviewEmail(): Promise<string> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(PREVIEW_EMAIL_COOKIE)?.value?.trim().toLowerCase();

  return (
    fromCookie ||
    getRuntimeEnv("PORTAL_PREVIEW_EMAIL")?.trim().toLowerCase() ||
    DEFAULT_PREVIEW_EMAIL
  );
}

async function buildCurrentUser(
  teacher: PortalTeacher,
  source: CurrentUser["source"],
): Promise<CurrentUserResult> {
  if (!teacher.isActive) {
    return { ok: false, reason: "inactive" };
  }

  if (teacher.appAccessStatus === "blocked") {
    return { ok: false, reason: "blocked" };
  }

  if (teacher.appAccessStatus === "pending") {
    return { ok: false, reason: "pending" };
  }

  const role = resolveRole(teacher);
  const mentorTeacherIds =
    role === "mentor"
      ? (await getTeachersForMentor(teacher.itemId)).map((entry) => entry.itemId)
      : [];

  return {
    ok: true,
    user: {
      teacherItemId: teacher.itemId,
      email: teacher.email.toLowerCase(),
      name: teacher.name,
      role,
      appAccessStatus: teacher.appAccessStatus,
      isActive: teacher.isActive,
      mentorTeacherIds,
      supplierRelationId: null,
      supplierFileStatus: teacher.supplierFileStatus,
      source,
    },
  };
}

async function resolveByEmail(
  email: string,
  source: CurrentUser["source"],
): Promise<CurrentUserResult> {
  const teachers = await getPortalTeachersByEmail(email);

  if (!teachers.length) {
    return { ok: false, reason: "not_found", message: email };
  }

  if (teachers.length > 1) {
    return {
      ok: false,
      reason: "duplicate_email",
      message: `${email} מופיע ביותר מכרטיס מורה אחד (${teachers
        .map((teacher) => `#${teacher.itemId}`)
        .join(", ")})`,
    };
  }

  return buildCurrentUser(teachers[0], source);
}

async function resolveCurrentUserUncached(): Promise<CurrentUserResult> {
  try {
    if (getAuthMode() === "preview") {
      return await resolveByEmail(await getPreviewEmail(), "preview");
    }

    const email = await getCloudflareAccessEmail();

    if (!email) {
      return { ok: false, reason: "unauthenticated" };
    }

    return await resolveByEmail(email, "cloudflare");
  } catch (error) {
    if (error instanceof PortalConfigurationError) {
      return { ok: false, reason: "config_error", message: error.message };
    }

    if (error instanceof MondayApiError) {
      return { ok: false, reason: "monday_error", message: error.message };
    }

    return {
      ok: false,
      reason: "monday_error",
      message: error instanceof Error ? error.message : "שגיאה לא צפויה",
    };
  }
}

/** Per-request memoized current user. Authorization stays fresh per request. */
export const resolveCurrentUser = cache(resolveCurrentUserUncached);

export function isPortalPreviewAuth(): boolean {
  return getAuthMode() === "preview";
}
