export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Loading</span>
      <div className="h-3 w-40 rounded-full bg-navy/10" />
      <div className="mt-4 h-24 w-full rounded-2xl bg-navy/10" />
      <div className="mt-8 h-12 w-full rounded-xl bg-navy/[0.07]" />
      <div className="mt-5 h-13 w-full rounded-xl bg-navy/10" />
    </div>
  );
}
