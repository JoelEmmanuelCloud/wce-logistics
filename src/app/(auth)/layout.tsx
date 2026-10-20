import Image from "next/image";
import Link from "next/link";
import { WceLogo } from "@/components/wce-logo";
import { IMAGES } from "@/data/images";

export const instant = false;

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-svh bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-[clamp(20px,4vw,64px)] py-[clamp(20px,4vh,40px)]">
        <Link href="/" aria-label="WCE Logistics home" className="w-fit text-[18px]">
          <WceLogo tone="dark" />
        </Link>
        <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-12">{children}</main>
        <p className="text-[13px] text-navy/60">Move more. Build more.</p>
      </div>
      <aside className="relative hidden overflow-hidden bg-navy lg:block" aria-hidden="true">
        <Image src={IMAGES.onDemand.src} alt="" fill sizes="50vw" loading="eager" className="object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent" />
        <div className="absolute inset-x-12 bottom-12 text-white">
          <p className="font-display text-[clamp(48px,5vw,88px)] uppercase leading-[0.9]">
            Verified trucks.
            <span className="block text-orange">Every state.</span>
          </p>
          <p className="mt-5 max-w-[26em] text-[17px] leading-relaxed text-white/80">
            One account to book interstate freight, or to put your trucks to work on the routes you already run.
          </p>
        </div>
      </aside>
    </div>
  );
}
