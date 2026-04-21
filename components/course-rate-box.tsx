import { formatCurrency } from "@/lib/utils";

function formatRate(rate: number | null) {
  if (rate === null || Number.isNaN(rate)) {
    return "לא הוגדר";
  }

  return formatCurrency(rate);
}

export function CourseRateBox({
  teachingRate,
  travelRate,
}: {
  teachingRate: number | null;
  travelRate: number | null;
}) {
  const total =
    teachingRate !== null && travelRate !== null ? teachingRate + travelRate : null;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-slate-800">
      <div className="mb-3 font-semibold text-blue-900">💡 תעריף מוסכם לקורס זה</div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <span>הוראה:</span>
          <span className="font-medium">{formatRate(teachingRate)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>נסיעות:</span>
          <span className="font-medium">{formatRate(travelRate)}</span>
        </div>
        <div className="my-2 border-t border-blue-200" />
        <div className="flex items-center justify-between gap-4 font-semibold text-blue-950">
          <span>סה&quot;כ צפוי:</span>
          <span>{total === null ? "לא הוגדר" : formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
