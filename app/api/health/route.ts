import { NextResponse } from "next/server";

import { isMondayPreviewMode } from "@/lib/monday/mock";
import { getRuntimeEnv } from "@/lib/runtime-env";

export const dynamic = "force-dynamic";

const RELEASE = "2026-05-05-monday-preview-v2";

export function GET() {
  const hasMondayToken = Boolean(getRuntimeEnv("MONDAY_API_TOKEN"));

  return NextResponse.json({
    ok: true,
    release: RELEASE,
    hasMondayToken,
    defaultDataMode: isMondayPreviewMode() ? "preview" : "monday",
  });
}
