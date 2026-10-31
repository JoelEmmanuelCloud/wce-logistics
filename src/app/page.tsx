import type { Metadata } from "next";
import { Hero } from "@/components/hero";
import { FaqSection } from "@/components/sections/faq-section";
import { HowItWorksSection } from "@/components/sections/how-it-works-section";
import { IndustriesSection } from "@/components/sections/industries-section";
import { PopularProducts } from "@/components/sections/popular-products";
import { PricingSection } from "@/components/sections/pricing-section";
import { ServicesSection } from "@/components/sections/services-section";
import { ShopSection } from "@/components/sections/shop-section";
import { TrustSection } from "@/components/sections/trust-section";
import { VendorSection } from "@/components/sections/vendor-section";
import { SiteCart } from "@/components/shop/site-cart";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StructuredData } from "@/components/structured-data";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export default function Home() {
  const contactEmail = site.contactEmail;
  const whatsappUrl = site.whatsappUrl;
  return (
    <>
      <StructuredData />
      <SiteHeader contactEmail={contactEmail} whatsappUrl={whatsappUrl} cart={<SiteCart />} />
      <main>
        <Hero contactEmail={contactEmail} whatsappUrl={whatsappUrl} />
        <PopularProducts />
        <ShopSection />
        <ServicesSection />
        <HowItWorksSection />
        <TrustSection />
        <PricingSection />
        <IndustriesSection />
        <VendorSection />
        <FaqSection contactEmail={contactEmail} whatsappUrl={whatsappUrl} />
      </main>
      <SiteFooter contactEmail={contactEmail} contactWhatsApp={site.contactWhatsApp} whatsappUrl={whatsappUrl} />
    </>
  );
}
