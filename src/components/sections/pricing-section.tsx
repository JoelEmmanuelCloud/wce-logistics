import Image from "next/image";
import { LockIcon, ReceiptIcon, ScaleIcon } from "@/components/line-icons";
import { DisplayHeading, Section } from "@/components/section";
import { PriceEstimate } from "@/components/sections/price-estimate";
import { IMAGES } from "@/data/images";

const FORMULA = [
  { term: "Chargeable weight", note: "Your declared load in kg" },
  { operator: "×" },
  { term: "Rate per tonne", note: "Set by the vendor for your route" },
  { operator: "+" },
  { term: "Itemised charges", note: "Loading, offloading, tolls" },
  { operator: "=" },
  { term: "Your total", note: "In naira, before you pay", highlight: true },
] as const;

const RULES = [
  {
    Icon: ScaleIcon,
    title: "50 kg minimum",
    detail: "Every shipment starts at 50 kg, so trucks run full enough to keep rates fair for everyone on board.",
  },
  {
    Icon: LockIcon,
    title: "Your quote is held",
    detail: "Once your booking is confirmed, later changes to a vendor's rates never touch the price you agreed.",
  },
  {
    Icon: ReceiptIcon,
    title: "Nothing hidden",
    detail: "Each additional charge is listed line by line, and you see the final amount before you commit.",
  },
];

export function PricingSection() {
  return (
    <Section id="pricing" tone="white" labelledBy="pricing-title">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <DisplayHeading id="pricing-title">
            Priced by
            <span className="block pl-[0.6em] text-orange-deep">the kilo</span>
          </DisplayHeading>
        </div>
        <p className="max-w-[32em] text-[clamp(17px,1.35vw,21px)] leading-relaxed text-navy/75 lg:justify-self-end">
          No haggling over the phone. Your price comes from one transparent calculation that you can check line by
          line.
        </p>
      </div>

      <div
        className="mt-[clamp(40px,5vw,72px)] grid items-stretch gap-3 rounded-[28px] bg-sand p-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.15fr]"
        role="group"
        aria-label="Price calculation: chargeable weight times rate per tonne, plus itemised charges, equals your total in naira"
      >
        {FORMULA.map((part, index) =>
          "operator" in part ? (
            <span
              key={index}
              aria-hidden="true"
              className="grid place-items-center font-display text-[clamp(36px,3vw,52px)] leading-none text-orange-deep lg:px-2"
            >
              {part.operator}
            </span>
          ) : (
            <div
              key={part.term}
              className={`flex flex-col justify-between gap-6 rounded-[22px] p-[clamp(20px,2vw,32px)] ${"highlight" in part ? "bg-navy text-white" : "bg-white"}`}
            >
              <span className="font-display text-[clamp(26px,2.2vw,38px)] uppercase leading-[0.95]">{part.term}</span>
              <span className={`text-[14px] ${"highlight" in part ? "text-white/70" : "text-navy/70"}`}>{part.note}</span>
            </div>
          ),
        )}
      </div>

      <PriceEstimate />

      <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-[5fr_7fr] lg:gap-5">
        <div className="relative min-h-[260px] overflow-hidden rounded-[28px]">
          <Image
            src={IMAGES.warehouse.src}
            alt={IMAGES.warehouse.alt}
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/10 to-transparent" aria-hidden="true" />
          <p className="absolute inset-x-6 bottom-6 font-display text-[clamp(26px,2.4vw,40px)] uppercase leading-[0.95] text-white">
            Pay for the space <span className="text-orange">you use</span>
          </p>
        </div>
        <ul className="grid gap-4 lg:gap-5">
          {RULES.map(({ Icon, title, detail }) => (
            <li key={title} className="flex gap-5 rounded-[28px] border border-navy/10 p-[clamp(22px,2.2vw,32px)]">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-orange/12 text-orange-ink">
                <Icon className="size-6" />
              </span>
              <div>
                <h3 className="text-[19px] font-semibold">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-navy/70">{detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
