import { NextRequest, NextResponse } from "next/server";

import { MondayApiError } from "@/lib/monday/client";
import { getMockCoursesForTeacher, isPreviewRequest } from "@/lib/monday/mock";
import {
  getCoursesForTeacher,
  getEligibleCoursesForPayment,
  getEligibleCoursesForReplacement,
} from "@/lib/monday/queries";
import { PAYMENT_ROUTE_CONFIGS } from "@/lib/payment/config";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(request: NextRequest) {
  const teacherId = Number(request.nextUrl.searchParams.get("teacherId"));
  const routeKey = request.nextUrl.searchParams.get("routeKey");

  if (!teacherId || Number.isNaN(teacherId)) {
    return NextResponse.json({ error: "teacherId is required." }, { status: 400 });
  }

  try {
    const routeConfig =
      routeKey === "course" || routeKey === "replacement" ? PAYMENT_ROUTE_CONFIGS[routeKey] : null;

    if (isPreviewRequest(request.nextUrl.searchParams)) {
      const courses = getMockCoursesForTeacher(teacherId);
      return NextResponse.json(
        routeConfig?.allowedCourseStatuses
          ? courses.filter((course) => routeConfig.allowedCourseStatuses?.includes(course.state))
          : courses,
      );
    }

    const courses =
      routeKey === "course"
        ? await getEligibleCoursesForPayment(teacherId)
        : routeKey === "replacement"
          ? await getEligibleCoursesForReplacement(teacherId)
          : await getCoursesForTeacher(teacherId);
    return NextResponse.json(courses);
  } catch (error) {
    if (error instanceof MondayApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "לא הצלחנו לטעון את הקורסים." }, { status: 500 });
  }
}
