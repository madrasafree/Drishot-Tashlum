import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FormPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="pb-4">
        <CardTitle>{title}</CardTitle>
        <div className="space-y-3 text-base text-slate-600">{description}</div>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
}
