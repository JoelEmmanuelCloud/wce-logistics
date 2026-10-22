const STAR_PATH = "M10 1.6l2.47 5.3 5.8.68-4.3 3.96 1.15 5.73L10 14.4l-5.12 2.87 1.15-5.73-4.3-3.96 5.8-.68z";

export function Stars({ value, className = "size-4" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} viewBox="0 0 20 20" className={className}>
          <path d={STAR_PATH} className={star <= Math.round(value) ? "fill-orange" : "fill-navy/15"} />
        </svg>
      ))}
    </span>
  );
}

export function RatingSummary({ average, count }: { average: number; count: number }) {
  if (count === 0) {
    return <span className="text-[13px] text-navy/70">No reviews yet</span>;
  }
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-navy/80">
      <Stars value={average} />
      <span>
        <span className="font-semibold text-navy">{average.toFixed(1)}</span> out of 5 from {count} review{count === 1 ? "" : "s"}
      </span>
    </span>
  );
}
