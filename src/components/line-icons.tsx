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

export function HomeIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M4 10.5L12 4L20 10.5V19.5H14.5V14H9.5V19.5H4Z" />
    </LineIcon>
  );
}

export function BoxIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M4 8L12 4L20 8V16L12 20L4 16Z" />
      <path d="M4 8L12 12L20 8M12 12V20" />
    </LineIcon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M4.5 6.5H19.5V19.5H4.5Z" />
      <path d="M4.5 10.5H19.5M8.5 4V8M15.5 4V8" />
    </LineIcon>
  );
}

export function TruckLineIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M3 6.5H14V16.5H3Z" />
      <path d="M14 10H18L21 13V16.5H14" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </LineIcon>
  );
}

export function RouteIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="18" cy="18" r="2.2" />
      <path d="M8.2 6H15.5C17.4 6 18.5 7.1 18.5 9C18.5 10.9 17.4 12 15.5 12H8.5C6.6 12 5.5 13.1 5.5 15C5.5 16.9 6.6 18 8.5 18H15.8" />
    </LineIcon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19.5C5.8 16.2 8.5 14.5 12 14.5C15.5 14.5 18.2 16.2 19 19.5" />
    </LineIcon>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19C4.2 16.2 6.3 14.5 9 14.5C11.7 14.5 13.8 16.2 14.5 19" />
      <path d="M15 6.2C16.6 6.4 17.8 7.6 17.8 9.2C17.8 10.8 16.6 12 15 12.2M17 14.8C18.8 15.4 20 16.9 20.5 19" />
    </LineIcon>
  );
}

export function IdCardIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M3.5 6H20.5V18H3.5Z" />
      <circle cx="9" cy="11" r="2" />
      <path d="M6 15.5C6.5 14.3 7.6 13.6 9 13.6C10.4 13.6 11.5 14.3 12 15.5M14.5 10H18M14.5 13.5H17" />
    </LineIcon>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M4 7.5H19.5V19H4Z" />
      <path d="M4 7.5L15.5 4.5V7.5M15 12.5H19.5V15H15Z" />
    </LineIcon>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M12 4L14.4 9L19.8 9.6L15.8 13.3L16.9 18.7L12 16L7.1 18.7L8.2 13.3L4.2 9.6L9.6 9Z" />
    </LineIcon>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M4 19.5H20" />
      <path d="M7 16V11M12 16V6M17 16V9" />
    </LineIcon>
  );
}

export function FlagIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M6 20V4.5" />
      <path d="M6 5H17L15 9L17 13H6" />
    </LineIcon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M4 7H13M17 7H20M4 17H7M11 17H20" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </LineIcon>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M9 7H20M9 12H20M9 17H20" />
      <path d="M4.5 7H5M4.5 12H5M4.5 17H5" />
    </LineIcon>
  );
}

export function CartIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M3.5 4.5H6L8.5 15.5H18L20 7.5H7" />
      <circle cx="10" cy="19" r="1.4" />
      <circle cx="16.5" cy="19" r="1.4" />
    </LineIcon>
  );
}

export function StoreIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M4 10V19.5H20V10" />
      <path d="M3 10L5 4.5H19L21 10C21 11.4 19.9 12.5 18.5 12.5C17.1 12.5 16 11.4 16 10C16 11.4 14.9 12.5 13.5 12.5H10.5C9.1 12.5 8 11.4 8 10C8 11.4 6.9 12.5 5.5 12.5C4.1 12.5 3 11.4 3 10Z" />
    </LineIcon>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M4 7H20M4 12H20M4 17H20" />
    </LineIcon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M6 6L18 18M18 6L6 18" />
    </LineIcon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M14.5 6L8.5 12L14.5 18" />
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
