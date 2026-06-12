"use server";

import type { Route } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { isPortalPreviewAuth, PREVIEW_EMAIL_COOKIE } from "@/lib/auth/current-user";

export async function switchPreviewUser(formData: FormData) {
  // Preview identity switching must never exist in a real deployment.
  if (!isPortalPreviewAuth()) {
    notFound();
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(PREVIEW_EMAIL_COOKIE, email, { path: "/" });
  redirect("/dashboard" as Route);
}
