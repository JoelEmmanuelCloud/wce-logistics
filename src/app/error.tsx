"use client";

import Link from "next/link";
import { WceLogo } from "@/components/wce-logo";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-svh flex-col bg-navy px-[clamp(20px,3.2vw,56px)] py-[clamp(20px,4vh,48px)] text-white">
      <Link href="/" aria-label="WCE Logistics home" className="w-fit text-[clamp(15px,1.45vw,22px)]">
        <WceLogo />
      </Link>
      <div className="my-auto py-16">
        <h1 className="font-display text-[clamp(48px,7vw,120px)] uppercase leading-[0.9]">
          Something
          <span className="block text-orange">broke down.</span>
        </h1>
        <p className="mt-6 max-w-[30em] text-[clamp(17px,1.35vw,21px)] leading-relaxed text-white/75">
          We could not load this page. Please try again, and if the problem continues, contact our team.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-orange px-7 py-4 text-[17px] font-medium text-navy transition-colors hover:bg-[#FF7F24]"
          >
            Try again
          </button>
          <Link href="/" className="rounded-xl border border-white/30 px-7 py-4 text-[17px] font-medium text-white hover:border-white">
            Back to the homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
