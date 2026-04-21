import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(78,173,224,0.18),_transparent_35%),linear-gradient(180deg,_rgba(255,255,255,0.5),_rgba(249,250,251,1))]" />
      <div className="relative">
        <header className="border-b border-white/60 bg-white/75 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
            <div className="text-right">
              <p className="text-sm font-semibold text-[var(--madrasa-blue-dark)]">מדרסה</p>
              <p className="text-xs text-slate-500">לומדים לתקשר</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--madrasa-blue)]/15 text-lg font-bold text-[var(--madrasa-blue-dark)]">
              מ׳
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
