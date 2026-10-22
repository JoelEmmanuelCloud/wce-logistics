import { ContactButton } from "@/components/contact-button";
import { WceLogo, WceMonogramMarks } from "@/components/wce-logo";
import { SERVICES } from "@/data/landing";

const COMPANY_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Industries", href: "#industries" },
  { label: "Become a vendor", href: "#vendors" },
  { label: "FAQ", href: "#faq" },
];

const BRAND_LINE = ["Heavy equipment", "Trucks", "Buses", "Logistics", "On demand"];

export function SiteFooter({ contactEmail }: { contactEmail: string }) {
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto w-full max-w-[1760px] px-[clamp(20px,3.2vw,56px)] pt-[clamp(72px,9vw,136px)]">
        <div className="grid gap-10 border-b border-white/12 pb-[clamp(48px,6vw,88px)] lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <p className="font-display text-[clamp(60px,9vw,160px)] uppercase leading-[0.86]">
            Move more.
            <span className="block pl-[0.5em] text-orange">Build more.</span>
          </p>
          <div className="flex flex-col gap-6 lg:items-end">
            <p className="max-w-[24em] text-[clamp(17px,1.35vw,21px)] leading-relaxed text-white/75 lg:text-right">
              Tell us what you need to move and where. We will connect you with a verified truck.
            </p>
            <ContactButton href={`mailto:${contactEmail}`} label="Get in touch" />
          </div>
        </div>

        <div className="grid gap-10 py-[clamp(40px,5vw,72px)] sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <WceLogo className="text-[20px]" />
            <p className="mt-5 max-w-[22em] text-[15px] leading-relaxed text-white/60">
              Interstate logistics and truck booking across Nigeria.
            </p>
          </div>
          <nav aria-label="Services">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-orange">Services</h2>
            <ul className="mt-5 grid gap-3">
              {SERVICES.map((service) => (
                <li key={service.key}>
                  <a href="#services" className="text-[15px] text-white/80 transition-colors hover:text-white">
                    {service.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Company">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-orange">Company</h2>
            <ul className="mt-5 grid gap-3">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-[15px] text-white/80 transition-colors hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-orange">Contact</h2>
            <a
              href={`mailto:${contactEmail}`}
              className="mt-5 inline-block break-all text-[15px] text-white/80 transition-colors hover:text-white"
            >
              {contactEmail}
            </a>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="pointer-events-none mx-auto mt-[clamp(48px,6vw,96px)] w-full max-w-[1760px] select-none overflow-hidden px-[clamp(20px,3.2vw,56px)]">
        <svg viewBox="0 0 1600 200" className="block h-auto w-full translate-y-[14%] text-white/[0.07]">
          <g transform="scale(2)">
            <WceMonogramMarks ink="currentColor" accent="rgb(255 107 0 / 0.35)" />
          </g>
          <text x="660" y="180" textLength="940" lengthAdjust="spacingAndGlyphs" className="font-display-wide font-bold" fontSize="196" fill="currentColor">
            LOGISTICS
          </text>
        </svg>
      </div>

      <div className="border-t border-white/12">
        <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-4 px-[clamp(20px,3.2vw,56px)] py-7 text-[12px] font-medium uppercase tracking-[0.2em] text-white/70 lg:flex-row lg:items-center lg:justify-between">
          <p>WCE Logistics</p>
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            {BRAND_LINE.map((item, index) => (
              <span key={item} className="flex gap-3">
                {index > 0 && <span aria-hidden="true">/</span>}
                {item}
              </span>
            ))}
          </p>
          <p>Move more. Build more.</p>
        </div>
      </div>
    </footer>
  );
}
