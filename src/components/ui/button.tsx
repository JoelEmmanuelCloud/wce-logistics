"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

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

export function buttonClasses(variant: ButtonVariant = "primary", size: keyof typeof SIZES = "md", className = ""): string {
  return `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

type SubmitButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  variant?: ButtonVariant;
  size?: keyof typeof SIZES;
  pendingLabel?: ReactNode;
};

export function SubmitButton({ variant = "primary", size = "md", pendingLabel, children, className, disabled, ...rest }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {pending && (
        <svg viewBox="0 0 24 24" className="size-4 animate-spin" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
