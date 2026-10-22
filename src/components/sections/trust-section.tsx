import Image from "next/image";
import { DocumentIcon, GaugeIcon, PinCheckIcon, ShieldCheckIcon } from "@/components/line-icons";
import { DisplayHeading, Eyebrow, Section } from "@/components/section";
import { IMAGES } from "@/data/images";
import { BOOKING_STATUSES } from "@/data/landing";

const CHECKS = [
  {
    Icon: ShieldCheckIcon,
    title: "Vendors verified by people",
    detail: "Identity and business checks are reviewed by our operations team. Uploading documents is not the same as being approved.",
  },
  {
    Icon: DocumentIcon,
    title: "Every truck reviewed on its own",
    detail: "Registration, ownership, roadworthiness and insurance are checked per truck, and expired documents take it off the market.",
  },
  {
    Icon: GaugeIcon,
    title: "No double booking",
    detail: "Capacity is reserved the moment a booking is confirmed, so a truck is never sold beyond its verified payload.",
  },
  {
    Icon: PinCheckIcon,
    title: "Proof at both ends",
    detail: "Pickup and delivery are timestamped and confirmed, giving you a clear record if anything needs to be resolved.",
  },
];

export function TrustSection() {
  return (
    <Section id="trust" tone="navy" labelledBy="trust-title" watermark="right">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div className="lg:sticky lg:top-12 lg:self-start">
          <Eyebrow className="text-orange">Accountability</Eyebrow>
          <DisplayHeading id="trust-title" className="mt-5">
            Verified
            <span className="block text-orange">before</span>
            they move
          </DisplayHeading>
          <p className="mt-8 max-w-[30em] text-[clamp(17px,1.35vw,21px)] leading-relaxed text-white/75">
            Informal referrals and phone calls leave you guessing who is carrying your goods. Every vendor, truck
            and booking on WCE Logistics leaves a trail you can check.
          </p>
          <div className="relative mt-10 aspect-[4/3] overflow-hidden rounded-[28px] lg:aspect-[16/11]">
            <Image
              src={IMAGES.inspection.src}
              alt={IMAGES.inspection.alt}
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
            <span className="absolute left-4 top-4 rounded-full bg-orange px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-navy">
              Checked per truck
            </span>
          </div>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {CHECKS.map(({ Icon, title, detail }) => (
            <li key={title} className="rounded-[28px] border border-white/12 bg-white/[0.04] p-[clamp(24px,2.4vw,36px)]">
              <span className="grid size-14 place-items-center rounded-full bg-orange text-navy">
                <Icon className="size-7" />
              </span>
              <h3 className="mt-8 text-[clamp(20px,1.6vw,24px)] font-semibold">{title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-white/70">{detail}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-[clamp(56px,7vw,104px)] rounded-[28px] bg-white p-[clamp(24px,3vw,48px)] text-navy">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <h3 className="font-display text-[clamp(28px,2.6vw,44px)] uppercase leading-none">Every booking, every status</h3>
          <p className="text-[15px] text-navy/70">Email updates and a live booking page at each step</p>
        </div>
        <ol className="status-track mt-10 grid gap-6 sm:grid-cols-5 sm:gap-0">
          {BOOKING_STATUSES.map((status, index) => (
            <li key={status} className="relative flex items-center gap-4 sm:flex-col sm:items-start sm:gap-5">
              <span className="relative z-10 grid size-11 shrink-0 place-items-center rounded-full bg-orange font-display text-lg text-navy ring-4 ring-white sm:ring-8">
                {index + 1}
              </span>
              {index < BOOKING_STATUSES.length - 1 && (
                <span
                  className="status-line absolute left-[22px] top-11 h-[calc(100%-20px)] w-[3px] bg-orange sm:left-11 sm:top-[20px] sm:h-[3px] sm:w-[calc(100%-44px)]"
                  aria-hidden="true"
                />
              )}
              <span className="text-[16px] font-semibold sm:pr-4">{status}</span>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
