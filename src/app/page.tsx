import type { Metadata } from "next";
import { Hero } from "@/components/hero";
import { FaqSection } from "@/components/sections/faq-section";
import { HowItWorksSection } from "@/components/sections/how-it-works-section";
import { IndustriesSection } from "@/components/sections/industries-section";
import { PricingSection } from "@/components/sections/pricing-section";
import { ServicesSection } from "@/components/sections/services-section";
import { TrustSection } from "@/components/sections/trust-section";
import { VendorSection } from "@/components/sections/vendor-section";
import { SiteFooter } from "@/components/site-footer";
import { StructuredData } from "@/components/structured-data";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export default function Home() {
  const contactEmail = site.contactEmail;
  return (
    <>
      <StructuredData />
      <main>
        <Hero contactEmail={contactEmail} />
        <ServicesSection />
        <HowItWorksSection />
        <TrustSection />
        <PricingSection />
        <IndustriesSection />
        <VendorSection />
        <FaqSection contactEmail={contactEmail} />
      </main>
      <SiteFooter contactEmail={contactEmail} />
    </>
  );
}
