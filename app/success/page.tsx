"use client";

import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clearSession, getSubmissionSummary, type SubmissionSummary } from "@/lib/session";

export default function SuccessPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<SubmissionSummary | null>(null);

  useEffect(() => {
    setSummary(getSubmissionSummary());

    const timer = window.setTimeout(() => {
      void confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.7 },
      });
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <Card className="mx-auto max-w-2xl text-center">
      <CardHeader className="space-y-4">
        <CardTitle>הדרישה נקלטה בהצלחה</CardTitle>
        <div className="space-y-3 text-base text-slate-600">
          {summary ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 text-right text-sm text-slate-800">
              <div className="space-y-1">
                <p>סוג דרישה: {summary.paymentTypeLabel}</p>
                <p>נושא: {summary.subject}</p>
                {summary.requestedUnits && summary.unitLabel ? (
                  <p>
                    מספר {summary.unitLabel}: {summary.requestedUnits}
                  </p>
                ) : null}
                <p className="font-semibold">
                  סטטוס: {summary.requiresManualReview ? "נשלח לבדיקה ידנית" : "נקלט כדרישה רגילה"}
                </p>
                {summary.reviewReason ? <p>{summary.reviewReason}</p> : null}
              </div>
            </div>
          ) : null}
          <p>לאחר טיפול בדרישה נעדכן אותך במייל.</p>
          <p>בכל שאלה נוספת ניתן לפנות אלינו: office@madrasafree.com</p>
          <p>עוסק פטור/מורשה: יש לשלוח קבלה לאחר ההפקדה, בהתאם להנחיות המשרד.</p>
        </div>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button
          size="lg"
          onClick={() => {
            clearSession();
            router.push("/");
          }}
        >
          הגשת דרישה נוספת
        </Button>
      </CardContent>
    </Card>
  );
}
