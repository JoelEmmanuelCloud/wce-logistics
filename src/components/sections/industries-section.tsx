import Image from "next/image";
import { DisplayHeading, Eyebrow, Section } from "@/components/section";
import { IMAGES } from "@/data/images";
import { INDUSTRIES } from "@/data/landing";

export function IndustriesSection() {
  return (
    <Section id="industries" tone="sand" labelledBy="industries-title">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-20">
        <div>
          <Eyebrow className="text-orange-ink">Industries</Eyebrow>
          <DisplayHeading id="industries-title" className="mt-5">
            Who we
            <span className="block text-orange-deep">move for</span>
          </DisplayHeading>
          <p className="mt-8 max-w-[26em] text-[clamp(17px,1.35vw,21px)] leading-relaxed text-navy/75">
            From a single pallet to a site full of plant, businesses across these sectors use WCE Logistics to move
            between states.
          </p>
        </div>
        <ul className="border-t border-navy/15">
          {INDUSTRIES.map((industry, index) => {
            const image = IMAGES[industry.key];
            return (
              <li
                key={industry.key}
                className="group grid grid-cols-[auto_1fr] items-center gap-x-[clamp(16px,2vw,32px)] gap-y-4 border-b border-navy/15 py-[clamp(18px,2vw,28px)] sm:grid-cols-[auto_1fr_auto]"
              >
                <div className="relative aspect-[4/3] w-[clamp(104px,11vw,176px)] overflow-hidden rounded-[18px]">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="176px"
                    className="object-cover transition-[scale] duration-500 group-hover:scale-110"
                  />
                </div>
                <div>
                  <span className="font-display text-[clamp(16px,1.3vw,20px)] text-orange-ink">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="mt-1 font-display text-[clamp(30px,3.2vw,56px)] uppercase leading-none transition-transform duration-300 group-hover:translate-x-2">
                    {industry.title}
                  </h3>
                </div>
                <p className="col-span-2 text-[15px] text-navy/65 sm:col-span-1 sm:max-w-[15em] sm:text-right">{industry.summary}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}
