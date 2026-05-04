import { NextRequest, NextResponse } from "next/server";

import { MondayApiError } from "@/lib/monday/client";
import { getMockCourseMeetingsState, isMondayPreviewMode } from "@/lib/monday/mock";
import { getCourseMeetingsState } from "@/lib/monday/queries";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(request: NextRequest) {
  const courseId = Number(request.nextUrl.searchParams.get("courseId"));

  if (!courseId || Number.isNaN(courseId)) {
    return NextResponse.json({ error: "courseId is required." }, { status: 400 });
  }

  try {
    if (isMondayPreviewMode()) {
      return NextResponse.json(getMockCourseMeetingsState(courseId));
    }

    const state = await getCourseMeetingsState(courseId);
    return NextResponse.json(state);
  } catch (error) {
    if (error instanceof MondayApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "לא הצלחנו לטעון את מצב המפגשים בקורס." }, { status: 500 });
  }
}
