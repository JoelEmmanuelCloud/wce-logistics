export function PageSkeleton() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Loading</span>
      <div className="h-3 w-32 rounded-full bg-navy/10" />
      <div className="mt-4 h-12 w-2/3 max-w-[420px] rounded-lg bg-navy/10" />
      <div className="mt-4 h-4 w-full max-w-[560px] rounded-full bg-navy/[0.07]" />
      <div className="mt-10 grid gap-4">
        <div className="h-40 rounded-lg bg-white" />
        <div className="h-64 rounded-lg bg-white" />
      </div>
    </div>
  );
}
