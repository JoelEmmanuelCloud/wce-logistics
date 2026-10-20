import type { ReactNode } from "react";
import { WceMonogram } from "@/components/wce-logo";

const TONES = {
  white: "bg-white text-navy",
  sand: "bg-sand text-navy",
  navy: "bg-navy text-white",
  orange: "bg-orange text-navy",
} as const;

type Tone = keyof typeof TONES;

const WATERMARK_INK: Record<Tone, string> = {
  white: "text-navy opacity-[0.04]",
  sand: "text-navy opacity-[0.05]",
  navy: "text-white opacity-[0.05]",
  orange: "text-navy opacity-[0.08]",
};

export function Watermark({ side, tone, className }: { side: "left" | "right"; tone: Tone; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`watermark pointer-events-none absolute top-[clamp(24px,3vw,56px)] -z-10 ${side === "left" ? "-left-[6%]" : "-right-[6%]"} ${WATERMARK_INK[tone]} ${className ?? ""}`}
    >
      <WceMonogram tone="current" className="h-auto w-[min(1180px,82vw)]" />
    </div>
  );
}

export function Section({
  id,
  tone,
  labelledBy,
  className,
  watermark,
  children,
}: {
  id: string;
  tone: Tone;
  labelledBy: string;
  className?: string;
  watermark?: "left" | "right";
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`${TONES[tone]} scroll-mt-4 py-[clamp(72px,9vw,136px)] ${watermark ? "relative isolate overflow-clip" : ""} ${className ?? ""}`}>
      {watermark && <Watermark side={watermark} tone={tone} />}
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
