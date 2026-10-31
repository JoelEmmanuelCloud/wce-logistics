import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { COOKIE_POLICY } from "@/data/legal";

export const metadata: Metadata = {
  title: COOKIE_POLICY.title,
  description: COOKIE_POLICY.summary,
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return <LegalPage document={COOKIE_POLICY} />;
}
