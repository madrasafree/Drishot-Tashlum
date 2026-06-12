"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { CHIP_BASE_CLASS, ROLE_LABELS } from "@/components/portal/labels";
import type { PortalRole } from "@/lib/monday/portal-types";
import { cn } from "@/lib/utils";

interface PortalNavItem {
  label: string;
  href: Route;
}

export function PortalNav({
  name,
  role,
  isPreview,
}: {
  name: string;
  role: PortalRole;
  isPreview: boolean;
}) {
  const pathname = usePathname();

  const items: PortalNavItem[] = [
    { label: "לוח בקרה", href: "/dashboard" as Route },
    { label: "הקורסים שלי", href: "/courses" as Route },
    // Built by sibling workstreams — linked here, not owned here.
    { label: "דרישות תשלום", href: "/payments" as Route },
    { label: "חומרי הדרכה", href: "/materials" as Route },
  ];

  if (role === "admin") {
    items.push({ label: "ניהול", href: "/admin" as Route });
  }

  return (
    <nav
      aria-label="ניווט פורטל המורים"
      className="rounded-[1.6rem] border border-white/80 bg-card p-4 shadow-card backdrop-blur"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {items.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-bold transition-colors",
                  isActive
                    ? "bg-[linear-gradient(135deg,var(--madrasa-blue),var(--madrasa-green))] text-white shadow-[0_8px_20px_rgba(78,173,224,0.25)]"
                    : "text-slate-700 hover:bg-sky-50 hover:text-[var(--madrasa-blue-dark)]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-slate-900">{name}</span>
          <span
            className={cn(
              CHIP_BASE_CLASS,
              "border-[var(--madrasa-blue)]/25 bg-sky-50 text-[var(--madrasa-blue-dark)]",
            )}
          >
            {ROLE_LABELS[role]}
          </span>
          {isPreview && (
            <Link
              href={"/preview-login" as Route}
              className="text-xs font-semibold text-[var(--madrasa-blue-dark)] underline underline-offset-4 hover:text-[var(--madrasa-green-dark)]"
            >
              החלפת משתמש (תצוגה מקדימה)
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
