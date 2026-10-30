const VARIANTS = {
  primary: "bg-orange text-navy hover:bg-[#FF7F24] focus-visible:outline-navy",
  secondary: "bg-navy text-white hover:bg-[#13335c] focus-visible:outline-orange",
  outline: "border border-navy/20 bg-white text-navy hover:border-navy/40 hover:bg-navy/[0.03] focus-visible:outline-orange",
  danger: "bg-[#B42318] text-white hover:bg-[#912018] focus-visible:outline-navy",
  ghost: "text-navy hover:bg-navy/5 focus-visible:outline-orange",
} as const;

const SIZES = {
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-[16px]",
  sm: "h-9 px-3.5 text-[14px]",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className = ""): string {
  return `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}
