export function LoadingSpinner({ label = "טוען..." }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[var(--madrasa-blue)]" />
      <span>{label}</span>
    </div>
  );
}
