import Image from "next/image";
import { ContactButton, WhatsAppButton } from "@/components/contact-button";
import { CargoIcon } from "@/components/fleet-icons";
import { NigeriaRouteMap } from "@/components/nigeria-route-map";

const HERO_IMAGE =
  "https://images.unsplash.com/reserve/9JMZhTL8T7ulzIoD2E78_2010_02280041.JPG";

export function Hero({ contactEmail, whatsappUrl }: { contactEmail: string; whatsappUrl: string }) {
  return (
    <section className="relative isolate flex min-h-svh flex-col overflow-hidden bg-navy px-[clamp(20px,3.2vw,56px)] pb-[clamp(20px,3.4vh,44px)] pt-[calc(clamp(10px,1.6vh,16px)+58px)] lg:h-svh lg:min-h-[680px]">
      <Image
        src={HERO_IMAGE}
        alt="Cargo truck on an open highway at sunset"
        fill
        preload
        sizes="100vw"
        quality={80}
        className="-z-20 object-cover object-[30%_center]"
      />
      <div className="hero-warmth -z-10" aria-hidden="true" />

      <div className="mt-[clamp(32px,7vh,88px)] grid flex-1 content-start gap-10 lg:min-h-0 lg:content-stretch lg:grid-cols-[1fr_minmax(340px,31%)] lg:gap-6">
        <h1 className="font-display whitespace-nowrap uppercase leading-[0.86] text-white text-[clamp(60px,min(17.5vh,10.8vw),220px)]">
          <span className="hero-line block [--i:0]">Across</span>
          <span className="hero-line block pl-[0.62em] text-orange [--i:1]">Every State</span>
          <span className="hero-line block [--i:2]">On Demand</span>
        </h1>

        <div className="flex flex-col lg:min-h-0 lg:pt-1">
          <p className="hero-fade text-[clamp(26px,min(4.6vh,2.9vw),56px)] leading-[1.1] tracking-[-0.01em] text-navy [--d:200ms]">
            <span className="block">Logistics</span>
            <span className="block pl-[2.6em]">built for Nigeria</span>
            <span className="block">run on verified trucks</span>
          </p>
          <NigeriaRouteMap className="hero-fade [--d:380ms] mt-[clamp(16px,3vh,36px)] w-full max-w-[460px] lg:w-[min(100%,calc((100svh-540px)*1.25))] lg:max-w-none" />
          <p className="hero-fade [--d:620ms] mt-4 max-w-[19em] self-end rounded-md bg-white px-4 py-3 text-[clamp(15px,min(2.2vh,1.15vw),19px)] leading-[1.3] text-navy">
            We verify every vendor and truck, and track every load from pickup to delivery.
          </p>
        </div>
      </div>

      <div className="hero-fade [--d:520ms] mt-10 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between lg:mt-4">
        <div className="flex items-center gap-[clamp(12px,1.2vw,20px)]">
          <span className="font-display text-[clamp(56px,min(10vh,6.4vw),112px)] leading-[0.85] text-orange">50KG</span>
          <span className="text-[clamp(14px,min(2.2vh,1.2vw),19px)] leading-[1.3] text-white">
            <span className="block">minimum load, with</span>
            <span className="block">shared or dedicated</span>
            <span className="block pl-[5.2em]">trucks</span>
          </span>
          <span className="grid size-[clamp(56px,5vw,84px)] shrink-0 place-items-center rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
            <CargoIcon className="w-[72%]" />
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <WhatsAppButton href={whatsappUrl} />
          <ContactButton href={`mailto:${contactEmail}`} label="Get in touch" />
        </div>
      </div>
    </section>
  );
}
