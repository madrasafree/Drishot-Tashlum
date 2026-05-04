"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormPageShell } from "@/components/form-page-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSessionGuard } from "@/hooks/use-session-guard";
import type { PaymentRequestPayload } from "@/lib/monday/types";
import { saveSubmissionSummary } from "@/lib/session";

export default function OtherSubmitPage() {
  const router = useRouter();
  const { session, isReady } = useSessionGuard();
  const currentSession = session;
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isReady || !currentSession) {
    return null;
  }

  async function handleSubmit() {
    if (!currentSession) {
      return;
    }

    if (!details.trim()) {
      setSubmitError("יש למלא פירוט לפני השליחה.");
      return;
    }

    const sessionData = currentSession;
    setSubmitting(true);
    setSubmitError(null);

    const payload: PaymentRequestPayload = {
      submitterId: sessionData.teacherId,
      supplierId: sessionData.supplierId,
      teacherName: sessionData.teacherName,
      previewMode: sessionData.previewMode,
      paymentType: "other",
      details: details.trim(),
      courseClaimType: "other",
      requiresManualReview: true,
      manualReviewState: "needs_review",
      reviewReason: "דרישה מסוג אחר דורשת בדיקה ידנית",
    };

    try {
      const response = await fetch("/api/monday/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = (await response.json()) as { error?: string };
        throw new Error(errorPayload.error || "אירעה שגיאה בשליחת הדרישה. נסה שוב או פנה למשרד.");
      }

      saveSubmissionSummary({
        paymentTypeLabel: "אחר",
        subject: details.trim().slice(0, 40),
        requiresManualReview: true,
        reviewReason: "הדרישה תיבדק על ידי הצוות.",
      });
      router.push("/success");
    } catch (requestError) {
      setSubmitError(
        requestError instanceof Error
          ? requestError.message
          : "אירעה שגיאה בשליחת הדרישה. נסה שוב או פנה למשרד.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormPageShell
      title="דרישת תשלום למורה"
      description={
        <>
          <p>נא לפרט עבור מה הדרישה. דרישות מסוג אחר נשלחות לבדיקה ידנית של הצוות.</p>
          <p>אין צורך להזין נתוני תשלום במסך הזה; אם יידרש בירור נוסף, המשרד יפנה אליך.</p>
        </>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="details">פירוט</Label>
        <Textarea id="details" rows={4} value={details} onChange={(event) => setDetails(event.target.value)} />
      </div>

      {details.trim() ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          <h2 className="mb-3 text-base font-semibold">סיכום דרישה</h2>
          <div className="space-y-1">
            <p>מגיש/ה: {currentSession.teacherName}</p>
            <p>סוג דרישה: אחר</p>
            <p>פירוט: {details.trim()}</p>
            <p className="font-semibold">סטטוס: תישלח לבדיקה ידנית</p>
          </div>
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{submitError}</div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={() => router.push("/")}>
          חזרה
        </Button>
        <Button onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? "שולח..." : "שליחה לבדיקה"}
        </Button>
      </div>
    </FormPageShell>
  );
}
