import { SiteCart } from "@/components/shop/site-cart";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";

export default function StoreLayout({ children }: LayoutProps<"/">) {
  const contactEmail = site.contactEmail;
  const whatsappUrl = site.whatsappUrl;
  return (
    <>
      <SiteHeader contactEmail={contactEmail} whatsappUrl={whatsappUrl} cart={<SiteCart />} />
      <main className="min-h-svh bg-sand pb-[clamp(56px,7vw,104px)] pt-[clamp(104px,13vh,136px)] text-navy">
        <div className="mx-auto w-full max-w-[1500px] px-[clamp(16px,3.2vw,56px)]">{children}</div>
      </main>
      <SiteFooter contactEmail={contactEmail} contactWhatsApp={site.contactWhatsApp} whatsappUrl={whatsappUrl} />
    </>
  );
}
