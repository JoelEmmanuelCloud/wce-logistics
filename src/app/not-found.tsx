import type { Metadata } from "next";
import Link from "next/link";
import { WceLogo } from "@/components/wce-logo";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col bg-navy px-[clamp(20px,3.2vw,56px)] py-[clamp(20px,4vh,48px)] text-white">
      <Link href="/" aria-label="WCE Logistics home" className="w-fit text-[clamp(15px,1.45vw,22px)]">
        <WceLogo />
      </Link>
      <div className="my-auto py-16">
        <p className="font-display text-[clamp(120px,22vw,320px)] leading-[0.8] text-orange">404</p>
        <h1 className="mt-6 font-display text-[clamp(40px,5vw,80px)] uppercase leading-[0.95]">
          Wrong turn.
          <span className="block text-white/80">This road does not exist.</span>
        </h1>
        <Link
          href="/"
          className="mt-10 inline-flex items-center rounded-md bg-orange px-7 py-4 text-[17px] font-medium text-navy transition-colors hover:bg-[#FF7F24]"
        >
          Back to the homepage
        </Link>
      </div>
    </main>
  );
}
