import { NextRequest, NextResponse } from "next/server";

import { MondayApiError } from "@/lib/monday/client";
import { createPaymentRequest } from "@/lib/monday/queries";
import type { PaymentRequestPayload } from "@/lib/monday/types";

export const dynamic = "force-dynamic";

function isPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function validatePayload(payload: PaymentRequestPayload) {
  if (!payload.submitterId || !payload.supplierId || !payload.teacherName || !payload.paymentType) {
    return "חסרים פרטי בסיס לשליחת הדרישה.";
  }

  if (payload.paymentType === "course") {
    if (!payload.courseId || !isPositiveNumber(payload.teachingAmount)) {
      return "יש לבחור קורס ולמלא סכום הוראה.";
    }
  }

  if (payload.paymentType === "replacement") {
    if (
      !payload.replacedTeacherId ||
      !payload.courseId ||
      !payload.replacementDate ||
      !isPositiveNumber(payload.teachingAmount)
    ) {
      return "יש למלא את כל שדות החובה עבור דרישת החלפה.";
    }
  }

  if (payload.paymentType === "other") {
    if (!payload.details?.trim() || !isPositiveNumber(payload.amount)) {
      return "יש למלא פירוט וסכום עבור דרישה מסוג אחר.";
    }
  }

  if (payload.paymentType === "private_lessons") {
    if (!payload.privateLessonId || !payload.lessonsCount || !isPositiveNumber(payload.totalTransfer)) {
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

    const result = await createPaymentRequest(payload);
    return NextResponse.json(result);
  } catch (error) {
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
