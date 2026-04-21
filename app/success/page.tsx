"use client";

import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clearSession } from "@/lib/session";

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
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
        <CardTitle>דרישת התשלום נשלחה בהצלחה! 🎉</CardTitle>
        <div className="space-y-3 text-base text-slate-600">
          <p>לאחר ביצוע התשלום נעדכן אותך במייל.</p>
          <p>בכל שאלה נוספת ניתן לפנות אלינו: office@madrasafree.com</p>
          <p>התשלום מבוצע בשוטף 30+ (סוף החודש הבא).</p>
          <p>עוסק פטור/מורשה – עליך לשלוח קבלה לאחר ההפקדה.</p>
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
