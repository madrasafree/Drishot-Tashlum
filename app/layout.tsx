import type { Metadata } from "next";
import { Heebo } from "next/font/google";

import { AppShell } from "@/components/app-shell";

import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "הגשת דרישת תשלום למורה | מדרסה",
  description: "אפליקציית הגשת דרישות תשלום למורים בעמותת מדרסה.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={heebo.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
