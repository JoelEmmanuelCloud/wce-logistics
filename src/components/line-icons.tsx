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

export function MailIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M3.5 6.5H20.5V17.5H3.5Z" />
      <path d="M4 7L12 13L20 7" />
    </LineIcon>
  );
}

export function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
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
