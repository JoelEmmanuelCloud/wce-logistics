import Image from "next/image";
import type { ComponentType } from "react";
import { BusIcon, ExcavatorIcon, TruckIcon } from "@/components/fleet-icons";
import { ClockIcon } from "@/components/line-icons";
import { DisplayHeading, Eyebrow, Section } from "@/components/section";
import { IMAGES } from "@/data/images";
import { SERVICES, type ServiceKey } from "@/data/landing";
import { stagger } from "@/lib/motion";

const CARD_STYLES: Record<ServiceKey, { card: string; tag: string; layout: string }> = {
  freight: {
    card: "bg-navy text-white",
    tag: "border-white/25 text-white/90",
    layout: "lg:col-span-7",
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
  return <ClockIcon className={`${className ?? ""} text-orange-deep`} />;
}

const ICONS: Record<ServiceKey, ComponentType<{ className?: string }>> = {
  freight: TruckIcon,
  equipment: ExcavatorIcon,
  bus: BusIcon,
  onDemand: OnDemandIcon,
};

export function ServicesSection() {
  return (
    <Section id="services" tone="white" labelledBy="services-title" watermark="right">
      <div className="reveal grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <Eyebrow className="text-orange-ink">Services</Eyebrow>
          <DisplayHeading id="services-title" className="mt-5">
            What we <span className="text-orange-deep">move</span>
          </DisplayHeading>
        </div>
        <p className="max-w-[34em] text-[clamp(17px,1.35vw,21px)] leading-relaxed text-navy/75 lg:justify-self-end">
          Heavy equipment, trucks, buses and everyday freight, moved between Nigerian states by vendors we have
          verified, on trucks we have checked.
        </p>
      </div>

      <ul className="mt-[clamp(40px,5vw,72px)] grid gap-4 lg:grid-cols-12 lg:gap-5">
        {SERVICES.map((service, index) => {
          const style = CARD_STYLES[service.key];
          const Icon = ICONS[service.key];
          const image = IMAGES[service.key];
          const featured = service.key === "freight";
          return (
            <li
              key={service.key}
              style={stagger(index % 2)}
              className={`reveal lift group flex flex-col gap-[clamp(20px,2vw,32px)] rounded-[28px] p-3 pb-[clamp(24px,2.6vw,40px)] ${style.card} ${style.layout}`}
            >
              <div className="relative aspect-[16/9] overflow-hidden rounded-[20px] lg:aspect-auto lg:h-[clamp(220px,19vw,320px)]">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes={featured || service.key === "onDemand" ? "(min-width: 1760px) 960px, (min-width: 1024px) 56vw, 94vw" : "(min-width: 1760px) 690px, (min-width: 1024px) 40vw, 94vw"}
                  className="reveal-zoom object-cover transition-[scale] duration-700 group-hover:scale-[1.04]"
                />
                <span className="absolute bottom-4 left-4 grid size-[clamp(56px,4.6vw,72px)] place-items-center rounded-full bg-white shadow-[0_8px_24px_rgba(11,37,69,0.3)]">
                  <Icon className="w-[66%]" />
                </span>
              </div>
              <div className="px-[clamp(12px,1.4vw,28px)]">
                <h3
                  className={`font-display uppercase leading-[0.95] ${featured ? "text-[clamp(36px,3.6vw,64px)]" : "text-[clamp(30px,2.6vw,44px)]"}`}
                >
                  {service.title}
                </h3>
                <p className={`mt-4 max-w-[34em] leading-relaxed ${featured ? "text-[clamp(16px,1.25vw,19px)] text-white/80" : "text-[16px] opacity-90"}`}>
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
