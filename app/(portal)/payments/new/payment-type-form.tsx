"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { BookOpen, FileText, RefreshCcw, Target } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { PaymentType } from "@/lib/monday/types";
import { saveSession } from "@/lib/session";

// Same options as the standalone flow in app/page.tsx — the existing
// /submit/* pages are reused untouched and read the session saved here.
const paymentTypeOptions: Array<{
  value: PaymentType;
  label: string;
  icon: typeof BookOpen;
  route: Route;
}> = [
  { value: "course", label: "קורס", icon: BookOpen, route: "/submit/course" },
  { value: "replacement", label: "החלפה", icon: RefreshCcw, route: "/submit/replacement" },
  { value: "private_lessons", label: "שיעורים פרטיים", icon: Target, route: "/submit/private" },
  { value: "other", label: "אחר", icon: FileText, route: "/submit/other" },
];

interface PaymentTypeFormProps {
  /** Authenticated identity from the server — the client never picks a teacher. */
  teacherItemId: number;
  teacherName: string;
  supplierId: number;
  supplierFileStatus: string;
  previewMode: boolean;
}

export function PaymentTypeForm(props: PaymentTypeFormProps) {
  const router = useRouter();
  const [paymentType, setPaymentType] = useState<PaymentType>("course");

  const selectedRoute =
    paymentTypeOptions.find((option) => option.value === paymentType)?.route ||
    ("/payments/new" as Route);

  return (
    <section className="space-y-4">
      <div>
        <Label>בחירת סוג דרישה</Label>
        <p className="mt-1 text-sm text-slate-500">לאחר בחירת המסלול נמשיך לטופס מפגשים מתאים.</p>
      </div>
      <RadioGroup value={paymentType} onValueChange={(value) => setPaymentType(value as PaymentType)}>
        {paymentTypeOptions.map((option) => {
          const Icon = option.icon;
          return (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-4 rounded-2xl border border-sky-100 bg-white/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--madrasa-blue)] hover:bg-sky-50/70"
            >
              <RadioGroupItem value={option.value} className="mt-1" />
              <Icon className="mt-0.5 h-5 w-5 text-[var(--madrasa-blue-dark)]" />
              <div className="font-medium text-slate-900">{option.label}</div>
            </label>
          );
        })}
      </RadioGroup>
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={() => {
            saveSession({
              teacherId: props.teacherItemId,
              teacherName: props.teacherName,
              supplierId: props.supplierId,
              supplierFileStatus: props.supplierFileStatus,
              paymentType,
              previewMode: props.previewMode,
            });
            router.push(selectedRoute);
          }}
        >
          המשך
        </Button>
      </div>
    </section>
  );
}
