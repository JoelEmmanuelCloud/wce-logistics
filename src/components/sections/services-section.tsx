import type { ComponentType } from "react";
import { BusIcon, ExcavatorIcon, TruckIcon } from "@/components/fleet-icons";
import { ClockIcon } from "@/components/line-icons";
import { DisplayHeading, Eyebrow, Section } from "@/components/section";
import { SERVICES, type ServiceKey } from "@/data/landing";

const CARD_STYLES: Record<ServiceKey, { card: string; tag: string; layout: string }> = {
  freight: {
    card: "bg-navy text-white",
    tag: "border-white/25 text-white/90",
    layout: "lg:col-span-7 lg:min-h-[440px]",
  },
  equipment: {
    card: "bg-orange text-navy",
    tag: "border-navy/25 text-navy",
    layout: "lg:col-span-5",
  },
  bus: {
    card: "bg-sand text-navy",
    tag: "border-navy/20 text-navy/80",
    layout: "lg:col-span-5",
  },
  onDemand: {
    card: "bg-sand text-navy",
    tag: "border-navy/20 text-navy/80",
    layout: "lg:col-span-7",
  },
};

function OnDemandIcon({ className }: { className?: string }) {
  return <ClockIcon className={`${className ?? ""} text-orange`} />;
}

const ICONS: Record<ServiceKey, ComponentType<{ className?: string }>> = {
  freight: TruckIcon,
  equipment: ExcavatorIcon,
  bus: BusIcon,
  onDemand: OnDemandIcon,
};

export function ServicesSection() {
  return (
    <Section id="services" tone="white" labelledBy="services-title">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <Eyebrow className="text-orange">Services</Eyebrow>
          <DisplayHeading id="services-title" className="mt-5">
            What we <span className="text-orange">move</span>
          </DisplayHeading>
        </div>
        <p className="max-w-[34em] text-[clamp(17px,1.35vw,21px)] leading-relaxed text-navy/75 lg:justify-self-end">
          Heavy equipment, trucks, buses and everyday freight, moved between Nigerian states by vendors we have
          verified, on trucks we have checked.
        </p>
      </div>

      <ul className="mt-[clamp(40px,5vw,72px)] grid gap-4 lg:grid-cols-12 lg:gap-5">
        {SERVICES.map((service) => {
          const style = CARD_STYLES[service.key];
          const Icon = ICONS[service.key];
          const featured = service.key === "freight";
          return (
            <li
              key={service.key}
              className={`flex flex-col justify-between gap-10 rounded-[28px] p-[clamp(24px,2.6vw,40px)] ${style.card} ${style.layout}`}
            >
              <span
                className={`grid shrink-0 place-items-center rounded-full bg-white shadow-[0_8px_24px_rgba(11,37,69,0.18)] ${featured ? "size-[clamp(88px,9vw,136px)]" : "size-[clamp(64px,5.4vw,84px)]"}`}
              >
                <Icon className="w-[66%]" />
              </span>
              <div>
                <h3
                  className={`font-display uppercase leading-[0.95] ${featured ? "text-[clamp(40px,4.4vw,76px)]" : "text-[clamp(30px,2.6vw,44px)]"}`}
                >
                  {service.title}
                </h3>
                <p className={`mt-4 max-w-[30em] leading-relaxed ${featured ? "text-[clamp(16px,1.3vw,20px)] text-white/80" : "text-[16px] opacity-80"}`}>
                  {service.detail}
                </p>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {service.tags.map((tag) => (
                    <li key={tag} className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium ${style.tag}`}>
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
