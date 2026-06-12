"use client";

// Per-row approve/block form for /admin/users. Submits to the server action
// and shows the returned Hebrew message inline.

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { setAccessStatusAction, type AccessActionResult } from "../actions";

export function AccessActions({ teacherItemId }: { teacherItemId: number }) {
  const [result, formAction, pending] = useActionState<AccessActionResult | null, FormData>(
    setAccessStatusAction,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="teacherItemId" value={teacherItemId} />
      <div className="flex gap-2">
        <Button
          type="submit"
          name="decision"
          value="approve"
          size="sm"
          variant="outline"
          disabled={pending}
        >
          אישור
        </Button>
        <Button
          type="submit"
          name="decision"
          value="block"
          size="sm"
          variant="destructive"
          disabled={pending}
        >
          חסימה
        </Button>
      </div>
      {result ? (
        <p className={`text-xs ${result.ok ? "text-emerald-700" : "text-red-600"}`}>
          {result.message}
        </p>
      ) : null}
    </form>
  );
}
