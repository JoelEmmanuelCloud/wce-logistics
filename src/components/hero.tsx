import Image from "next/image";
import { ArrowButton, GlassButton } from "@/components/action-buttons";
import { MailIcon, WhatsAppIcon } from "@/components/line-icons";
import { NigeriaRouteMap } from "@/components/nigeria-route-map";

const TALK_LINK =
  "inline-flex h-10 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 font-semibold text-white backdrop-blur-md transition-colors hover:border-white hover:bg-white hover:text-navy";

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
          <span className="hero-mask">
            <span className="hero-line block [--i:0]">Across</span>
          </span>
          <span className="hero-mask [--indent:0.62em]">
            <span className="hero-line block text-orange [--i:1]">Every State</span>
          </span>
          <span className="hero-mask">
            <span className="hero-line block [--i:2]">On Demand</span>
          </span>
        </h1>

        <div className="flex flex-col lg:min-h-0 lg:pt-1">
          <p className="hero-fade max-w-[22em] rounded-2xl border border-white/15 bg-navy/45 px-5 py-4 text-[clamp(18px,min(2.8vh,1.6vw),26px)] leading-[1.3] text-white backdrop-blur-md [--d:200ms]">
            Built for Nigeria. Every vendor and truck <span className="hero-emphasis text-orange">checked before it moves.</span>
          </p>
          <NigeriaRouteMap className="hero-fade [--d:380ms] mt-[clamp(16px,3vh,36px)] w-full max-w-[460px] lg:w-[min(100%,calc((100svh-520px)*1.25))] lg:max-w-none" />
        </div>
      </div>

      <div className="hero-fade [--d:520ms] mt-10 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between lg:mt-4">
        <div className="flex items-center gap-[clamp(12px,1.2vw,20px)]">
          <span className="font-display text-[clamp(56px,min(10vh,6.4vw),112px)] leading-[0.85] text-orange">50KG</span>
          <span className="text-[clamp(14px,min(2.2vh,1.2vw),19px)] leading-[1.3] text-white">
            <span className="block">minimum load, with</span>
            <span className="block">shared or dedicated trucks</span>
          </span>
        </div>
        <div className="flex flex-col gap-4 sm:items-end">
          <div className="flex flex-wrap items-center gap-3">
            <ArrowButton href="/sign-in?as=customer" label="Book a truck" />
            <GlassButton href="/sign-in?as=vendor">List your truck</GlassButton>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[15px] text-white/85">
            <span className="mr-1">Prefer to talk?</span>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={TALK_LINK}>
              <WhatsAppIcon className="size-[18px] text-[#25D366]" />
              WhatsApp
            </a>
            <a href={`mailto:${contactEmail}`} className={TALK_LINK}>
              <MailIcon className="size-[18px] text-orange" />
              Email
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
