// Server-side error presentation for Monday-backed portal sections.
// Pages wrap each data fetch in try/catch and render <SectionError> so a
// missing mapping or a Monday outage never crashes the whole page.

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MondayApiError } from "@/lib/monday/client";
import { PortalConfigurationError } from "@/lib/monday/portal-types";

export function getPortalErrorMessage(error: unknown): string {
  if (error instanceof PortalConfigurationError) {
    return error.message;
  }

  if (error instanceof MondayApiError) {
    return `שגיאה בחיבור למאנדיי: ${error.message}`;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "שגיאה לא צפויה בטעינת הנתונים";
}

export function SectionError({
  title = "לא ניתן לטעון את הנתונים",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
