import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function SupplierBlockedAlert() {
  return (
    <Alert variant="destructive">
      <AlertTitle className="flex items-center gap-2 text-base">
        <AlertCircle className="h-4 w-4" />
        <span>חסרים מסמכי ספק בתוקף</span>
      </AlertTitle>
      <AlertDescription>
        <p>נא להעביר ישירות אל מיכל דקל במייל office@madrasafree.com:</p>
        <ul className="mt-3 list-disc space-y-1 pr-5">
          <li>אם את/ה עוסק פטור - נא לשלוח אישור עוסק פטור/מורשה + אישור ניכוי מס במקור בתוקף</li>
          <li>אם את/ה עובד בעבודה נוספת - נא לשלוח טופס תיאום מס לסוגי מס (לא שכר עבודה!)</li>
        </ul>
        <p className="mt-3 font-medium">לא ניתן להגיש דרישת תשלום עד לעדכון המסמכים.</p>
      </AlertDescription>
    </Alert>
  );
}
