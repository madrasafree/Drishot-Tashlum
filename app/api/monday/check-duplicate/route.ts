import { NextRequest, NextResponse } from "next/server";

import { MondayApiError } from "@/lib/monday/client";
import { checkDuplicatePaymentRequest } from "@/lib/monday/queries";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(request: NextRequest) {
  const teacherId = Number(request.nextUrl.searchParams.get("teacherId"));
  const courseId = Number(request.nextUrl.searchParams.get("courseId"));

  if (!teacherId || Number.isNaN(teacherId) || !courseId || Number.isNaN(courseId)) {
    return NextResponse.json(
      { error: "teacherId and courseId are required." },
      { status: 400 },
    );
  }

  try {
    const result = await checkDuplicatePaymentRequest(teacherId, courseId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MondayApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json(
      { error: "לא הצלחנו לבדוק כפילות עבור הקורס." },
      { status: 500 },
    );
  }
}
