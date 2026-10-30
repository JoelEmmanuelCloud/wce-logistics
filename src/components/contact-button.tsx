import { ArrowUpRightIcon, ChatIcon } from "@/components/line-icons";

export function ContactButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="group inline-flex h-16 shrink-0 items-center gap-5 rounded-full bg-orange pl-8 pr-2 text-[clamp(16px,1.2vw,19px)] font-semibold text-navy shadow-[0_12px_32px_rgba(255,107,0,0.35)] transition-[background-color,box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:bg-[#FF7F24] hover:shadow-[0_18px_44px_rgba(255,107,0,0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 motion-reduce:hover:translate-y-0"
    >
      {label}
      <span className="grid size-12 place-items-center rounded-full bg-navy text-white transition-transform duration-300 group-hover:rotate-45">
        <ArrowUpRightIcon className="size-5" />
      </span>
    </a>
  );
}

export function WhatsAppButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-16 shrink-0 items-center gap-3 rounded-full border border-white/35 bg-white/10 px-7 text-[clamp(16px,1.2vw,19px)] font-semibold text-white backdrop-blur-md transition-colors duration-300 hover:border-white hover:bg-white hover:text-navy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
    >
      <ChatIcon className="size-6" />
      Chat on WhatsApp
    </a>
  );
}
