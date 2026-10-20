import type { ReactNode } from "react";

const TONES = {
  info: "border-navy/15 bg-navy/[0.04] text-navy",
  success: "border-[#067647]/30 bg-[#ECFDF3] text-[#05603A]",
  warning: "border-[#B54708]/30 bg-[#FFFAEB] text-[#93370D]",
  error: "border-[#B42318]/30 bg-[#FEF3F2] text-[#912018]",
} as const;

export function Alert({ tone = "info", title, children }: { tone?: keyof typeof TONES; title?: string; children?: ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-2xl border px-4 py-3.5 text-[14px] leading-relaxed ${TONES[tone]}`}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1" : undefined}>{children}</div>}
    </div>
  );
}

export function FormMessage({ state }: { state: { status: string; message?: string } }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }
  return <Alert tone={state.status === "error" ? "error" : "success"}>{state.message}</Alert>;
}
