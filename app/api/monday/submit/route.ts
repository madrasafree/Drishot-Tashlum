import { NextRequest, NextResponse } from "next/server";

import { MondayApiError } from "@/lib/monday/client";
import { createMockPaymentRequest, isMondayPreviewMode } from "@/lib/monday/mock";
import { MondayConfigurationError, submitPaymentRequest } from "@/lib/monday/queries";
import type { PaymentRequestPayload } from "@/lib/monday/types";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

function isPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function validatePayload(payload: PaymentRequestPayload) {
  if (!payload.submitterId || !payload.supplierId || !payload.teacherName || !payload.paymentType) {
    return "חסרים פרטי בסיס לשליחת הדרישה.";
  }

  if (payload.paymentType === "course") {
    if (!payload.courseId || !isPositiveNumber(payload.requestedMeetings)) {
      return "יש לבחור קורס ולמלא מספר מפגשים להגשה.";
    }
  }

  if (payload.paymentType === "replacement") {
    if (
      !payload.replacedTeacherId ||
      !payload.courseId ||
      !payload.replacementDate ||
      !isPositiveNumber(payload.requestedMeetings)
    ) {
      return "יש למלא את כל שדות החובה עבור דרישת החלפה.";
    }
  }

  if (payload.paymentType === "other") {
    if (!payload.details?.trim()) {
      return "יש למלא פירוט עבור דרישה מסוג אחר.";
    }
  }

  if (payload.paymentType === "private_lessons") {
    if (!payload.privateLessonId || !isPositiveNumber(payload.lessonsCount)) {
      return "יש למלא את כל שדות החובה עבור שיעורים פרטיים.";
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as PaymentRequestPayload;
    const validationError = validatePayload(payload);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (payload.previewMode || isMondayPreviewMode()) {
      return NextResponse.json(createMockPaymentRequest(payload));
    }

    const result = await submitPaymentRequest(payload);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MondayConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (error instanceof MondayApiError) {
      return NextResponse.json(
        { error: "אירעה שגיאה בשליחת הדרישה. נסה שוב או פנה למשרד." },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: "אירעה שגיאה בשליחת הדרישה. נסה שוב או פנה למשרד." },
      { status: 500 },
    );
  }
}
