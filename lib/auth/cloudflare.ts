// Cloudflare Access identity. Server-side only.
//
// In production the app must sit behind a Cloudflare Access application so
// that Cloudflare injects the authenticated identity headers. The header is
// trustworthy only because Access strips/overrides it at the edge.
//
// TODO (production hardening): validate the `Cf-Access-Jwt-Assertion` JWT
// signature against the team public keys and CLOUDFLARE_ACCESS_AUD instead of
// trusting the plain email header alone.

import { headers } from "next/headers";

const ACCESS_EMAIL_HEADER = "cf-access-authenticated-user-email";
const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";

export async function getCloudflareAccessEmail(): Promise<string | null> {
  const requestHeaders = await headers();
  const email = requestHeaders.get(ACCESS_EMAIL_HEADER)?.trim().toLowerCase();

  return email || null;
}

export async function hasCloudflareAccessAssertion(): Promise<boolean> {
  const requestHeaders = await headers();
  return Boolean(requestHeaders.get(ACCESS_JWT_HEADER));
}
