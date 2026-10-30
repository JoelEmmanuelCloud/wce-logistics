import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { PRIVACY_POLICY } from "@/data/legal";

export const metadata: Metadata = {
  title: PRIVACY_POLICY.title,
  description: PRIVACY_POLICY.summary,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <LegalPage document={PRIVACY_POLICY} />;
}
