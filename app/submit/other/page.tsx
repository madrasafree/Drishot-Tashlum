"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormPageShell } from "@/components/form-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSessionGuard } from "@/hooks/use-session-guard";
import type { PaymentRequestPayload } from "@/lib/monday/types";

export default function OtherSubmitPage() {
  const router = useRouter();
  const { session, isReady } = useSessionGuard();
  const currentSession = session;
  const [details, setDetails] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isReady || !currentSession) {
    return null;
  }

  async function handleSubmit() {
    if (!details.trim() || !amount) {
      setSubmitError("יש למלא את כל שדות החובה לפני השליחה.");
      return;
    }

    if (!currentSession) {
      return;
    }

    const sessionData = currentSession;
    setSubmitting(true);
    setSubmitError(null);

    const payload: PaymentRequestPayload = {
      submitterId: sessionData.teacherId,
      supplierId: sessionData.supplierId,
      teacherName: sessionData.teacherName,
      paymentType: "other",
      details: details.trim(),
      amount: Number(amount),
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
          <p>נא לפרט עבור מה הדרישה ומה הסכום לתשלום סה&quot;כ.</p>
          <p>דרישות תשלום עבור הכנה, הכשרה, הדרכה וכו&apos; יטופלו בכפוף לאישור המלווה הפדגוגי שלך.</p>
        </>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="details">פירוט</Label>
        <Textarea id="details" rows={4} value={details} onChange={(event) => setDetails(event.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">סכום</Label>
        <Input
          id="amount"
          type="number"
          min={0}
          max={50000}
          placeholder="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </div>

      {submitError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{submitError}</div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={() => router.push("/")}>
          חזרה ←
        </Button>
        <Button onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? "שולח..." : "שליחת בקשה"}
        </Button>
      </div>
    </FormPageShell>
  );
}
