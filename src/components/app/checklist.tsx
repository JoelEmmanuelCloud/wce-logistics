export function Checklist({ items }: { items: ReadonlyArray<{ key: string; label: string; done: boolean }> }) {
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-3 text-[15px]">
          <span
            className={`grid size-6 shrink-0 place-items-center rounded-full ${item.done ? "bg-[#12B76A] text-white" : "border-2 border-navy/20 bg-white"}`}
            aria-hidden="true"
          >
            {item.done && (
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5L10 17.5L19 7.5" />
              </svg>
            )}
          </span>
          <span className={item.done ? "text-navy" : "text-navy/70"}>
            {item.label}
            <span className="sr-only">{item.done ? " (done)" : " (to do)"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
