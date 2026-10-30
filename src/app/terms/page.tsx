import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { TERMS_OF_SERVICE } from "@/data/legal";

export const metadata: Metadata = {
  title: TERMS_OF_SERVICE.title,
  description: TERMS_OF_SERVICE.summary,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <LegalPage document={TERMS_OF_SERVICE} />;
}
