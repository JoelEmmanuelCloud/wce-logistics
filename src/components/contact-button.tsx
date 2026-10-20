export function ContactButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="group relative block aspect-[540/84] w-[min(100%,440px)] text-navy focus-visible:outline-none"
    >
      <svg viewBox="0 0 540 84" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
        <rect x="0" y="0" width="420" height="84" rx="42" fill="var(--color-orange)" className="transition-[fill] duration-200 group-hover:fill-[#FF7F24]" />
        <path d="M398 6C428 14 440 30 462 30V54C440 54 428 70 398 78Z" fill="var(--color-orange)" className="transition-[fill] duration-200 group-hover:fill-[#FF7F24]" />
        <circle cx="498" cy="42" r="40" fill="none" stroke="var(--color-orange)" strokeWidth="3" />
        <circle cx="498" cy="42" r="40" fill="var(--color-orange)" className="origin-[498px_42px] scale-0 transition-transform duration-300 group-hover:scale-100 group-focus-visible:scale-100" />
      </svg>
      <span className="absolute inset-y-0 left-0 grid w-[77.8%] place-items-center text-[clamp(15px,1.3vw,20px)] font-medium">
        {label}
      </span>
      <span className="absolute inset-y-0 right-0 grid w-[14.8%] place-items-center text-white transition-colors group-hover:text-navy group-focus-visible:text-navy">
        <svg viewBox="0 0 24 24" className="w-[45%]" aria-hidden="true">
          <path d="M7 17L17 7M9 7H17V15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </a>
  );
}
