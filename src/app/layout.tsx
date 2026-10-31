import type { Metadata, Viewport } from "next";
import { Anton, Archivo, Saira } from "next/font/google";
import { Suspense } from "react";
import { SiteNotices } from "@/components/site-notices";
import { site } from "@/lib/site";
import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const saira = Saira({
  variable: "--font-saira",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  metadataBase: site.url,
  title: {
    default: `${site.name} | ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  appleWebApp: { capable: true, title: "WCE Logistics", statusBarStyle: "black-translucent" },
  keywords: site.keywords,
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: site.name,
    title: `${site.name} | ${site.tagline}`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} | ${site.tagline}`,
    description: site.description,
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0B2545",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${anton.variable} ${archivo.variable} ${saira.variable} antialiased`}>
      <body>
        {children}
        <Suspense fallback={null}>
          <SiteNotices />
        </Suspense>
      </body>
    </html>
  );
}
