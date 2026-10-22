export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
      <div className="h-32 animate-pulse rounded bg-slate-200" />
      <div className="h-32 animate-pulse rounded bg-slate-200" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
