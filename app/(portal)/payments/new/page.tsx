import { AlertCircle } from "lucide-react";

import { SupplierBlockedAlert } from "@/components/supplier-blocked-alert";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isPortalPreviewAuth } from "@/lib/auth/current-user";
import { requirePortalUser } from "@/lib/auth/guards";
import { MondayApiError } from "@/lib/monday/client";
import {
  SUPPLIER_FILE_STATUS_LABELS,
  TEACHER_SUPPLIER_STATUS_LABELS,
} from "@/lib/monday/constants";
import { getMockSupplierCheck, isMondayPreviewMode } from "@/lib/monday/mock";
import { getSupplierById, getTeacherById } from "@/lib/monday/queries";
import { getTodayInIsrael } from "@/lib/utils";

import { PaymentTypeForm } from "./payment-type-form";

export const dynamic = "force-dynamic";

// Mirrors the blocking rules of app/api/monday/supplier-check/route.ts —
// that route stays the source of truth for the standalone flow; this page
// runs the same check server-side for the authenticated portal user.
const BLOCKING_STATUSES = new Set<string>([
  TEACHER_SUPPLIER_STATUS_LABELS.DOCUMENTS_EXPIRED,
  TEACHER_SUPPLIER_STATUS_LABELS.BLOCKED_MUST_RECEIPT,
  SUPPLIER_FILE_STATUS_LABELS.DOCUMENTS_EXPIRED,
  SUPPLIER_FILE_STATUS_LABELS.BLOCKED_MUST_RECEIPT,
]);

interface SupplierGateResult {
  blocked: boolean;
  supplierId: number | null;
  /** Same value app/page.tsx stores in the session as supplierFileStatus. */
  teacherSupplierStatus: string;
}

async function checkSupplierForTeacher(teacherItemId: number): Promise<SupplierGateResult> {
  if (isMondayPreviewMode()) {
    const mockResult = getMockSupplierCheck(teacherItemId);
    return {
      blocked: mockResult.blocked,
      supplierId: mockResult.supplierId,
      teacherSupplierStatus: mockResult.teacherSupplierStatus,
    };
  }

  const teacher = await getTeacherById(teacherItemId);

  if (!teacher || !teacher.supplierRelationId) {
    return {
      blocked: true,
      supplierId: null,
      teacherSupplierStatus: teacher?.supplierFileStatus || "",
    };
  }

  const supplier = await getSupplierById(teacher.supplierRelationId);
  const today = getTodayInIsrael();
  const isTeacherBlocked = BLOCKING_STATUSES.has(teacher.supplierFileStatus);
  const isSupplierBlocked = supplier ? BLOCKING_STATUSES.has(supplier.fileStatus) : true;
  const isTaxExpired = !!supplier?.taxValidityDate && supplier.taxValidityDate < today;

  return {
    blocked: isTeacherBlocked || isSupplierBlocked || isTaxExpired,
    supplierId: teacher.supplierRelationId,
    teacherSupplierStatus: teacher.supplierFileStatus,
  };
}

export default async function NewPaymentRequestPage() {
  const user = await requirePortalUser();

  let supplierCheck: SupplierGateResult | null = null;
  let checkError: string | null = null;

  try {
    supplierCheck = await checkSupplierForTeacher(user.teacherItemId);
  } catch (error) {
    if (error instanceof MondayApiError) {
      checkError = "לא הצלחנו לבדוק את תיק הספק שלך. נסו לרענן את הדף או לפנות למשרד.";
    } else {
      throw error;
    }
  }

  // Non-null only when the teacher may continue to the submit flow.
  const approvedCheck =
    supplierCheck && !supplierCheck.blocked && supplierCheck.supplierId
      ? {
          supplierId: supplierCheck.supplierId,
          teacherSupplierStatus: supplierCheck.teacherSupplierStatus,
        }
      : null;

  return (
    <Card className="mx-auto max-w-4xl overflow-hidden">
      <div className="h-2 bg-[linear-gradient(90deg,var(--madrasa-blue),var(--madrasa-green))]" />
      <CardHeader className="space-y-4">
        <CardTitle>הגשת דרישת תשלום</CardTitle>
        <div className="space-y-3 text-base text-slate-600">
          <p>
            שלום {user.name}, הדרישה תוגש על שמך. יש למלא טופס נפרד עבור כל קורס.
          </p>
          <p>
            כדי להגיש דרישת תשלום יש להעביר למשרד מדרסה (
            <a
              className="font-medium text-[var(--madrasa-blue-dark)] underline"
              href="mailto:office@madrasafree.com"
            >
              office@madrasafree.com
            </a>
            ) מסמכי עוסק / תיאום מס בתוקף ואת פרטי חשבון הבנק. ללא מסמכים בתוקף לא ניתן להגיש.
          </p>
          <p>התשלום יעבור בשוטף 30+ (סוף החודש הבא).</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {checkError ? (
          <Alert variant="destructive">
            <AlertTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4" />
              <span>שגיאה בבדיקת תיק הספק</span>
            </AlertTitle>
            <AlertDescription>{checkError}</AlertDescription>
          </Alert>
        ) : approvedCheck ? (
          <>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              תיק הספק תקין וניתן להמשיך להגשת הדרישה.
            </div>
            <PaymentTypeForm
              teacherItemId={user.teacherItemId}
              teacherName={user.name}
              supplierId={approvedCheck.supplierId}
              supplierFileStatus={approvedCheck.teacherSupplierStatus}
              previewMode={isPortalPreviewAuth()}
            />
          </>
        ) : (
          <div className="space-y-3">
            <SupplierBlockedAlert />
            <p className="text-sm text-slate-600">
              לאחר שהמסמכים יעודכנו במשרד ניתן יהיה לחזור לעמוד זה ולהגיש דרישה חדשה.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
