import type { Tone } from "@/lib/labels";

const TONES: Record<Tone, string> = {
  neutral: "bg-navy/[0.07] text-navy",
  info: "bg-[#EFF4FF] text-[#1849A9]",
  success: "bg-[#ECFDF3] text-[#05603A]",
  warning: "bg-[#FFFAEB] text-[#93370D]",
  danger: "bg-[#FEF3F2] text-[#912018]",
};

const DOTS: Record<Tone, string> = {
  neutral: "bg-navy/50",
  info: "bg-[#2E90FA]",
  success: "bg-[#12B76A]",
  warning: "bg-[#F79009]",
  danger: "bg-[#F04438]",
};

export function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; tone: Tone }> }) {
  const entry = map[status] ?? { label: status, tone: "neutral" as Tone };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ${TONES[entry.tone]}`}>
      <span className={`size-1.5 rounded-full ${DOTS[entry.tone]}`} aria-hidden="true" />
      {entry.label}
    </span>
  );
}
