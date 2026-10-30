export function AuthFormSkeleton({ fields }: { fields: number }) {
  return (
    <div role="status" aria-live="polite" className="grid animate-pulse gap-5">
      <span className="sr-only">Loading</span>
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="grid gap-2">
          <div className="h-3.5 w-32 rounded-full bg-navy/10" />
          <div className="h-12 w-full rounded-xl bg-navy/[0.07]" />
        </div>
      ))}
      <div className="h-13 w-full rounded-xl bg-navy/10" />
    </div>
  );
}
