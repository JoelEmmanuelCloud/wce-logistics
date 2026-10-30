import type { ReactNode } from "react";

type IconProps = { className?: string };

function LineIcon({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M12 3L4.5 6V11.5C4.5 16 7.7 19.7 12 21C16.3 19.7 19.5 16 19.5 11.5V6Z" />
      <path d="M8.8 12L11 14.2L15.4 9.8" />
    </LineIcon>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M14 3H7C5.9 3 5 3.9 5 5V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V8Z" />
      <path d="M14 3V8H19M9 13H15M9 17H13" />
    </LineIcon>
  );
}

export function GaugeIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M4.5 17.5A8.5 8.5 0 1 1 19.5 17.5" />
      <path d="M12 13.5L16 9.5" />
      <circle cx="12" cy="13.5" r="1.2" />
    </LineIcon>
  );
}

export function PinCheckIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M12 21C12 21 19 15 19 9.5C19 5.4 15.9 2.5 12 2.5C8.1 2.5 5 5.4 5 9.5C5 15 12 21 12 21Z" />
      <path d="M9.2 9.6L11.2 11.6L14.8 8" />
    </LineIcon>
  );
}

export function ScaleIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M6 7H18L20 20H4Z" />
      <circle cx="12" cy="4.5" r="2" />
      <path d="M10 13.5H14" />
    </LineIcon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V7.5C8 5.3 9.8 3.5 12 3.5C14.2 3.5 16 5.3 16 7.5V10.5M12 14.5V16.5" />
    </LineIcon>
  );
}

export function ReceiptIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M6 3H18V21L15.5 19.5L13.5 21L12 19.5L10.5 21L8.5 19.5L6 21Z" />
      <path d="M9 8H15M9 12H15M9 16H12" />
    </LineIcon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12L15 14" />
    </LineIcon>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M4 12C4 7.6 7.6 4 12 4C16.4 4 20 7.6 20 12C20 16.4 16.4 20 12 20C10.7 20 9.4 19.7 8.3 19.1L4 20L5 16C4.4 14.8 4 13.4 4 12Z" />
      <path d="M8.5 10.5H15.5M8.5 13.5H13" />
    </LineIcon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M5 12.5L10 17.5L19 7.5" />
    </LineIcon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M12 5V19M5 12H19" />
    </LineIcon>
  );
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M7 17L17 7M9 7H17V15" />
    </LineIcon>
  );
}
