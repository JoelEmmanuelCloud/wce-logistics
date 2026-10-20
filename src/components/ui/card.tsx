import type { ReactNode } from "react";

const CARD_TONES = {
  light: "border-navy/10 bg-white text-navy",
  dark: "border-navy bg-navy text-white",
  attention: "border-orange-ink/40 bg-white text-navy",
  danger: "border-[#B42318]/30 bg-white text-navy",
} as const;

export function Card({ children, className, tone = "light" }: { children: ReactNode; className?: string; tone?: keyof typeof CARD_TONES }) {
  return <section className={`rounded-[24px] border p-[clamp(20px,2.4vw,32px)] ${CARD_TONES[tone]} ${className ?? ""}`}>{children}</section>;
}

export function CardHeader({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-[19px] font-semibold text-navy">{title}</h2>
        {description && <p className="mt-1 text-[14px] leading-relaxed text-navy/70">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow && <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-orange-ink">{eyebrow}</p>}
        <h1 className="mt-2 font-display text-[clamp(34px,4vw,56px)] uppercase leading-[0.95] text-navy">{title}</h1>
        {description && <p className="mt-3 max-w-[44em] text-[16px] leading-relaxed text-navy/70">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[24px] border border-dashed border-navy/20 bg-white px-6 py-14 text-center">
      <h2 className="font-display text-[28px] uppercase leading-none text-navy">{title}</h2>
      <p className="mt-3 max-w-[30em] text-[15px] leading-relaxed text-navy/70">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function DescriptionList({ items }: { items: ReadonlyArray<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[12px] font-semibold uppercase tracking-[0.12em] text-navy/70">{item.label}</dt>
          <dd className="mt-1 text-[15px] text-navy">{item.value ?? <span className="text-navy/70">Not provided</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
