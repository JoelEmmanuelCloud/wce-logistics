"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";
import { DisplayHeading, Eyebrow, Section } from "@/components/section";
import { IMAGES } from "@/data/images";
import { SHIPPER_STEPS, VENDOR_STEPS, type Step } from "@/data/landing";

const AUDIENCES: ReadonlyArray<{ key: string; label: string; intro: string; steps: ReadonlyArray<Step> }> = [
  {
    key: "shippers",
    label: "For shippers",
    intro: "From the first quote to the signed-off delivery, every step of your booking is on record.",
    steps: SHIPPER_STEPS,
  },
  {
    key: "vendors",
    label: "For vendors",
    intro: "Turn empty trips and idle capacity into paid, verified bookings on the routes you already run.",
    steps: VENDOR_STEPS,
  },
];

export function HowItWorksSection() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const audience = AUDIENCES[active];

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
      return;
    }
    event.preventDefault();
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const next = (active + offset + AUDIENCES.length) % AUDIENCES.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <Section id="how-it-works" tone="sand" labelledBy="how-title" watermark="left">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <Eyebrow className="text-orange-ink">How it works</Eyebrow>
          <DisplayHeading id="how-title" className="mt-5">
            Four steps,
            <span className="block pl-[0.6em] text-orange-deep">one record</span>
          </DisplayHeading>
        </div>
        <div className="flex flex-col gap-6 lg:items-end">
          <div role="tablist" aria-label="Choose your role" className="inline-flex w-fit rounded-full bg-navy/[0.06] p-1.5">
            {AUDIENCES.map((item, index) => {
              const selected = index === active;
              return (
                <button
                  key={item.key}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`how-tab-${item.key}`}
                  aria-selected={selected}
                  aria-controls={`how-panel-${item.key}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(index)}
                  onKeyDown={onTabKeyDown}
                  className={`rounded-full px-5 py-2.5 text-[15px] font-semibold transition-colors ${selected ? "bg-navy text-white" : "text-navy/70 hover:text-navy"}`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <p className="max-w-[30em] text-[clamp(17px,1.35vw,21px)] leading-relaxed text-navy/75 lg:text-right">{audience.intro}</p>
        </div>
      </div>

      <figure className="relative mt-[clamp(40px,5vw,72px)] h-[clamp(220px,26vw,420px)] overflow-hidden rounded-[28px]">
        <Image src={IMAGES.lagos.src} alt={IMAGES.lagos.alt} fill sizes="(min-width: 1760px) 1650px, 94vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/70 via-navy/20 to-transparent" aria-hidden="true" />
        <figcaption className="absolute bottom-[clamp(20px,2.4vw,36px)] left-[clamp(20px,2.4vw,36px)] max-w-[14em] font-display text-[clamp(28px,3vw,52px)] uppercase leading-[0.95] text-white">
          Built for <span className="text-orange">Nigerian roads</span>
        </figcaption>
      </figure>

      <div id={`how-panel-${audience.key}`} role="tabpanel" aria-labelledby={`how-tab-${audience.key}`}>
        <ol key={audience.key} className="mt-4 grid gap-4 sm:grid-cols-2 lg:mt-5 lg:grid-cols-4 lg:gap-5">
          {audience.steps.map((step, index) => (
            <li
              key={step.title}
              className="group relative flex min-h-[220px] sm:min-h-[280px] flex-col justify-between overflow-hidden rounded-[28px] bg-white p-[clamp(24px,2.4vw,36px)] transition-colors duration-300 hover:bg-navy hover:text-white"
            >
              <span className="font-display text-[clamp(72px,7vw,112px)] leading-none text-transparent [-webkit-text-stroke:2px_var(--color-orange)] transition-colors duration-300 group-hover:text-orange">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-[clamp(20px,1.6vw,24px)] font-semibold">{step.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed opacity-75">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
