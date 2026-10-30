type IconProps = { className?: string };

export function TruckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="5" y="19" width="35" height="21" rx="2" fill="var(--color-orange)" />
      <path d="M9 23H36M9 28H36M9 33H36" stroke="#E25E00" strokeWidth="1.5" />
      <path d="M40 25H50L58 33V40H40Z" fill="var(--color-navy)" />
      <path d="M43 27.5H49L54 32.5H43Z" fill="#CFE3F5" />
      <rect x="5" y="40" width="53" height="4" rx="1" fill="#1B2A3D" />
      <circle cx="15" cy="46" r="5.5" fill="var(--color-navy)" />
      <circle cx="15" cy="46" r="2" fill="#D9DEE5" />
      <circle cx="49" cy="46" r="5.5" fill="var(--color-navy)" />
      <circle cx="49" cy="46" r="2" fill="#D9DEE5" />
    </svg>
  );
}

export function BusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="5" y="17" width="54" height="26" rx="5" fill="var(--color-orange)" />
      <rect x="9" y="21" width="9" height="9" rx="1.5" fill="#CFE3F5" />
      <rect x="20" y="21" width="9" height="9" rx="1.5" fill="#CFE3F5" />
      <rect x="31" y="21" width="9" height="9" rx="1.5" fill="#CFE3F5" />
      <rect x="42" y="21" width="13" height="13" rx="1.5" fill="#CFE3F5" />
      <rect x="5" y="34" width="37" height="3" fill="var(--color-navy)" />
      <rect x="5" y="40" width="54" height="3" rx="1" fill="#1B2A3D" />
      <circle cx="16" cy="45" r="5.5" fill="var(--color-navy)" />
      <circle cx="16" cy="45" r="2" fill="#D9DEE5" />
      <circle cx="47" cy="45" r="5.5" fill="var(--color-navy)" />
      <circle cx="47" cy="45" r="2" fill="#D9DEE5" />
    </svg>
  );
}

export function ExcavatorIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="6" y="42" width="34" height="9" rx="4.5" fill="var(--color-navy)" />
      <circle cx="11" cy="46.5" r="2" fill="#D9DEE5" />
      <circle cx="23" cy="46.5" r="2" fill="#D9DEE5" />
      <circle cx="35" cy="46.5" r="2" fill="#D9DEE5" />
      <rect x="10" y="31" width="26" height="11" rx="2" fill="var(--color-orange)" />
      <path d="M22 21H33V31H22Z" fill="var(--color-orange)" />
      <path d="M24.5 23.5H31V29H24.5Z" fill="#CFE3F5" />
      <path
        d="M34 33L47 16L56 30"
        fill="none"
        stroke="#E25E00"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M52 29H61L58 40H51Z" fill="var(--color-navy)" />
    </svg>
  );
}
