import { DisplayHeading, Eyebrow, Section } from "@/components/section";
import { INDUSTRIES } from "@/data/landing";

export function IndustriesSection() {
  return (
    <Section id="industries" tone="sand" labelledBy="industries-title">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-20">
        <div>
          <Eyebrow className="text-orange">Industries</Eyebrow>
          <DisplayHeading id="industries-title" className="mt-5">
            Who we
            <span className="block text-orange">move for</span>
          </DisplayHeading>
          <p className="mt-8 max-w-[26em] text-[clamp(17px,1.35vw,21px)] leading-relaxed text-navy/75">
            From a single pallet to a site full of plant, businesses across these sectors use WCE Logistics to move
            between states.
          </p>
        </div>
        <ul className="border-t border-navy/15">
          {INDUSTRIES.map((industry, index) => (
            <li
              key={industry.title}
              className="group grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-1 border-b border-navy/15 py-[clamp(22px,2.6vw,36px)] sm:grid-cols-[auto_1fr_auto]"
            >
              <span className="font-display text-[clamp(18px,1.4vw,22px)] text-orange">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="font-display text-[clamp(34px,3.6vw,60px)] uppercase leading-none transition-transform duration-300 group-hover:translate-x-2">
                {industry.title}
              </h3>
              <p className="col-start-2 text-[15px] text-navy/65 sm:col-start-3 sm:max-w-[16em] sm:text-right">{industry.summary}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
