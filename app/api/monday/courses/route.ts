import { NextRequest, NextResponse } from "next/server";

import { MondayApiError } from "@/lib/monday/client";
import { getCoursesForTeacher } from "@/lib/monday/queries";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(request: NextRequest) {
  const teacherId = Number(request.nextUrl.searchParams.get("teacherId"));

  if (!teacherId || Number.isNaN(teacherId)) {
    return NextResponse.json({ error: "teacherId is required." }, { status: 400 });
  }

  try {
    const courses = await getCoursesForTeacher(teacherId);
    return NextResponse.json(courses);
  } catch (error) {
    if (error instanceof MondayApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "לא הצלחנו לטעון את הקורסים." }, { status: 500 });
  }
}
