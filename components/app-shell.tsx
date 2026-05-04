import type { ReactNode } from "react";
import Image from "next/image";

import { PreviewNav } from "@/components/preview-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_8%,_rgba(78,173,224,0.24),_transparent_34%),radial-gradient(circle_at_12%_20%,_rgba(139,197,63,0.18),_transparent_26%),linear-gradient(180deg,_rgba(255,255,255,0.9),_rgba(244,250,252,0.88)_42%,_rgba(249,253,242,0.9))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-[linear-gradient(90deg,var(--madrasa-green),var(--madrasa-blue),var(--madrasa-green))]" />
      <div className="pointer-events-none absolute -right-20 top-32 h-64 w-64 rounded-full border-[28px] border-[var(--madrasa-blue)]/10" />
      <div className="pointer-events-none absolute -left-24 bottom-12 h-72 w-72 rounded-full border-[32px] border-[var(--madrasa-green)]/10" />

      <div className="relative">
        <header className="border-b border-white/70 bg-white/75 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="rounded-[1.6rem] border border-white bg-white/85 p-2 shadow-[0_18px_50px_rgba(78,173,224,0.16)]">
                  <Image
                    src="/madrasa-logo.png"
                    alt="מדרסה - לומדים לתקשר"
                    width={170}
                    height={110}
                    priority
                    className="h-14 w-auto sm:h-16"
                  />
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--madrasa-green-dark)]">
                    לומדים לתקשר
                  </p>
                  <p className="text-xl font-extrabold text-slate-950 sm:text-2xl">דרישות תשלום למורים</p>
                  <p className="mt-1 text-sm text-slate-500">טופס מפגשים ברור, בעברית, לפני חיבור מלא למאנדיי</p>
                </div>
              </div>
              <div className="hidden rounded-full border border-[var(--madrasa-blue)]/20 bg-sky-50 px-4 py-2 text-sm font-semibold text-[var(--madrasa-blue-dark)] sm:block">
                أهلا وسهلا
              </div>
            </div>

            <PreviewNav className="lg:max-w-md" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
