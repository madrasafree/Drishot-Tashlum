// Shared card layout for access-state pages (pending / blocked / unauthorized).

import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatePageCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl py-8">
      <Card>
        <CardHeader className="items-center text-center">
          <CardTitle>{title}</CardTitle>
          <p className="text-base leading-8 text-slate-600">{description}</p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          {children}
          <p className="text-sm text-slate-600">
            לשאלות ובירורים אפשר לפנות למשרד:{" "}
            <a
              href="mailto:office@madrasafree.com"
              className="font-semibold text-[var(--madrasa-blue-dark)] underline underline-offset-4"
            >
              office@madrasafree.com
            </a>
          </p>
          <Button asChild variant="outline">
            <Link href="/">חזרה לעמוד הראשי</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
