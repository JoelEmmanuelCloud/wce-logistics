import { SERVICES } from "@/data/landing";
import { site } from "@/lib/site";

export function StructuredData() {
  const url = site.url.toString();
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url,
    logo: new URL("/icon.svg", site.url).toString(),
    slogan: site.tagline,
    description: site.description,
    email: site.contactEmail,
    areaServed: { "@type": "Country", name: "Nigeria" },
    makesOffer: SERVICES.map((service) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: service.title, description: service.summary },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }}
    />
  );
}
