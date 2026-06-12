import type { Route } from "next";
import Link from "next/link";
import { AlertCircle, Plus } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePortalUser } from "@/lib/auth/guards";
import { MondayApiError } from "@/lib/monday/client";
import { PAYMENT_REQUEST_STATUS_LABELS } from "@/lib/monday/constants";
import {
  getMyPaymentRequests,
  type PaymentRequestListEntry,
} from "@/lib/monday/payment-requests";
import { cn, formatShortDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Status chip colors: green = paid, blue = new, amber = waiting, red = rejected.
function getStatusChipClass(statusLabel: string) {
  if (statusLabel === PAYMENT_REQUEST_STATUS_LABELS.PAID) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (statusLabel === PAYMENT_REQUEST_STATUS_LABELS.NEW) {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  if (statusLabel === PAYMENT_REQUEST_STATUS_LABELS.REJECTED) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (statusLabel.includes("ממתין")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function PaymentRequestRow({ request }: { request: PaymentRequestListEntry }) {
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-sky-100 bg-white/85 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="font-medium text-slate-900">{request.name}</p>
        <p className="text-sm text-slate-500">
          {request.paymentTypeLabel ? <span>{request.paymentTypeLabel} · </span> : null}
          <span>הוגשה בתאריך {formatShortDate(request.submitDate)}</span>
        </p>
      </div>
      <span
        className={cn(
          "inline-flex w-fit items-center rounded-full border px-3 py-1 text-sm font-medium",
          getStatusChipClass(request.statusLabel),
        )}
      >
        {request.statusLabel}
      </span>
    </li>
  );
}

export default async function MyPaymentRequestsPage() {
  const user = await requirePortalUser();

  let requests: PaymentRequestListEntry[] | null = null;
  let loadError: string | null = null;

  try {
    requests = await getMyPaymentRequests(user.teacherItemId);
  } catch (error) {
    if (error instanceof MondayApiError) {
      loadError = "לא הצלחנו לטעון את דרישות התשלום שלך. נסו לרענן את הדף או לחזור מאוחר יותר.";
    } else {
      throw error;
    }
  }

  return (
    <Card className="mx-auto max-w-4xl overflow-hidden">
      <div className="h-2 bg-[linear-gradient(90deg,var(--madrasa-blue),var(--madrasa-green))]" />
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>דרישות התשלום שלי</CardTitle>
          <Button asChild size="lg">
            <Link href={"/payments/new" as Route}>
              <Plus className="h-5 w-5" />
              <span>הגשת דרישה חדשה</span>
            </Link>
          </Button>
        </div>
        <p className="text-base text-slate-600">
          כאן ניתן לעקוב אחרי סטטוס הדרישות שהגשת. הסכומים מטופלים על ידי המשרד ואינם מוצגים בפורטל.
        </p>
      </CardHeader>
      <CardContent>
        {loadError ? (
          <Alert variant="destructive">
            <AlertTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4" />
              <span>שגיאה בטעינת הדרישות</span>
            </AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : requests && requests.length ? (
          <ul className="space-y-3">
            {requests.map((request) => (
              <PaymentRequestRow key={request.itemId} request={request} />
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 px-4 py-10 text-center">
            <p className="text-base font-medium text-slate-700">עדיין לא הוגשו דרישות תשלום</p>
            <p className="mt-1 text-sm text-slate-500">
              לחיצה על &quot;הגשת דרישה חדשה&quot; תתחיל את תהליך ההגשה.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
