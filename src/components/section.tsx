import type { ReactNode } from "react";

const TONES = {
  white: "bg-white text-navy",
  sand: "bg-sand text-navy",
  navy: "bg-navy text-white",
  orange: "bg-orange text-navy",
} as const;

type Tone = keyof typeof TONES;

export function Section({
  id,
  tone,
  labelledBy,
  className,
  children,
}: {
  id: string;
  tone: Tone;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`${TONES[tone]} scroll-mt-4 py-[clamp(72px,9vw,136px)] ${className ?? ""}`}>
      <div className="mx-auto w-full max-w-[1760px] px-[clamp(20px,3.2vw,56px)]">{children}</div>
    </section>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={`flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.18em] ${className ?? ""}`}>
      <span className="size-2 rounded-full bg-current" aria-hidden="true" />
      {children}
    </p>
  );
}

export function DisplayHeading({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <h2 id={id} className={`font-display uppercase leading-[0.9] text-[clamp(48px,6.6vw,112px)] ${className ?? ""}`}>
      {children}
    </h2>
  );
}
