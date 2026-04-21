import { NextRequest, NextResponse } from "next/server";

import {
  SUPPLIER_FILE_STATUS_LABELS,
  TEACHER_SUPPLIER_STATUS_LABELS,
} from "@/lib/monday/constants";
import { MondayApiError } from "@/lib/monday/client";
import { getSupplierById, getTeacherById } from "@/lib/monday/queries";
import { getTodayInIsrael } from "@/lib/utils";

export const dynamic = "force-dynamic";

const BLOCKING_STATUSES = new Set<string>([
  TEACHER_SUPPLIER_STATUS_LABELS.DOCUMENTS_EXPIRED,
  TEACHER_SUPPLIER_STATUS_LABELS.BLOCKED_MUST_RECEIPT,
  SUPPLIER_FILE_STATUS_LABELS.DOCUMENTS_EXPIRED,
  SUPPLIER_FILE_STATUS_LABELS.BLOCKED_MUST_RECEIPT,
]);

export async function GET(request: NextRequest) {
  const teacherId = Number(request.nextUrl.searchParams.get("teacherId"));

  if (!teacherId || Number.isNaN(teacherId)) {
    return NextResponse.json({ error: "teacherId is required." }, { status: 400 });
  }

  try {
    const teacher = await getTeacherById(teacherId);

    if (!teacher) {
      return NextResponse.json({ error: "המורה לא נמצא." }, { status: 404 });
    }

    if (!teacher.supplierRelationId) {
      return NextResponse.json({
        blocked: true,
        reason: "לא נמצא ספק מקושר למורה.",
        teacherSupplierStatus: teacher.supplierFileStatus,
        supplierFileStatus: null,
        taxValidityDate: null,
        supplierId: null,
      });
    }

    const supplier = await getSupplierById(teacher.supplierRelationId);
    const today = getTodayInIsrael();
    const isTeacherBlocked = BLOCKING_STATUSES.has(teacher.supplierFileStatus);
    const isSupplierBlocked = supplier ? BLOCKING_STATUSES.has(supplier.fileStatus) : true;
    const isTaxExpired = !!supplier?.taxValidityDate && supplier.taxValidityDate < today;
    const blocked = isTeacherBlocked || isSupplierBlocked || isTaxExpired;

    return NextResponse.json({
      blocked,
      reason: blocked ? "חסרים מסמכי ספק בתוקף" : null,
      teacherSupplierStatus: teacher.supplierFileStatus,
      supplierFileStatus: supplier?.fileStatus || null,
      taxValidityDate: supplier?.taxValidityDate || null,
      supplierId: teacher.supplierRelationId,
    });
  } catch (error) {
    if (error instanceof MondayApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "לא הצלחנו לבדוק את תיק הספק." }, { status: 500 });
  }
}
