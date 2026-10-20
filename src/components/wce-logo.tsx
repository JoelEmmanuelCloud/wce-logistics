type WceLogoProps = {
  className?: string;
  tone?: "light" | "dark" | "current";
};

export function WceMonogramMarks({ ink, accent = "var(--color-orange)" }: { ink: string; accent?: string }) {
  return (
    <>
      <path d="M0 10H27L41 60L55 10H76L90 60L104 10H131L107 90H79L65.5 44L52 90H24Z" fill={ink} />
      <path d="M216 20H174C157 20 146 31 146 50C146 69 157 80 174 80H216" fill="none" stroke={ink} strokeWidth="20" strokeLinejoin="round" />
      <path d="M228 10H300V30H228ZM228 70H300V90H228Z" fill={ink} />
      <path d="M221 40H296L286 60H211Z" fill={accent} />
    </>
  );
}

export function WceMonogram({ className, tone = "light" }: WceLogoProps) {
  const ink = tone === "current" ? "currentColor" : tone === "light" ? "#FFFFFF" : "var(--color-navy)";
  return (
    <svg viewBox="0 0 300 100" className={className} aria-hidden="true">
      <WceMonogramMarks ink={ink} />
    </svg>
  );
}

export function WceLogo({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const ink = tone === "light" ? "text-white" : "text-navy";
  return (
    <span className={`inline-flex items-center gap-3 ${ink} ${className ?? ""}`}>
      <WceMonogram tone={tone} className="h-[1.6em] w-auto" />
      <span className="h-[1.5em] w-[2px] bg-orange" aria-hidden="true" />
      <span className="font-display-wide text-[0.95em] font-bold tracking-[0.04em]">
        LOGISTICS
      </span>
    </span>
  );
}
