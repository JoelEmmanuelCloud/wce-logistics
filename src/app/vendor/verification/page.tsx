import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { uploadVendorDocumentAction } from "@/app/vendor/actions";
import { Checklist } from "@/components/app/checklist";
import { DocumentUploadForm } from "@/components/app/document-upload-form";
import { VendorStatusBanner } from "@/components/app/vendor-status-banner";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DOCUMENT_STATUS, formatDate } from "@/lib/labels";
import { requireRole } from "@/server/auth/dal";
import type { VendorDocument } from "@/server/db/schema";
import {
  DOCUMENT_TITLES,
  findVendorProfileByUser,
  latestDocumentsByType,
  listVendorDocuments,
  requiredVendorDocuments,
  vendorIsEditable,
  vendorSubmissionChecks,
} from "@/server/vendors";
import { IdentityForm } from "./identity-form";
import { SubmitReviewForm } from "./submit-review-form";

export const metadata: Metadata = { title: "Verification" };

const DOCUMENT_HELP: Record<VendorDocument["type"], string> = {
  government_id: "A clear photo or scan of the ID you entered above.",
  cac_certificate: "Your Corporate Affairs Commission certificate of incorporation or business name registration.",
  proof_of_address: "A recent utility bill or bank statement showing your business address.",
  operating_authority: "A signed letter from the truck owners authorising you to list and operate their trucks.",
};

export default async function VendorVerificationPage() {
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  if (!profile) {
    redirect("/vendor/profile");
  }

  const documents = await listVendorDocuments(profile.id);
  const latest = latestDocumentsByType(documents);
  const required = requiredVendorDocuments(profile.category);
  const types: VendorDocument["type"][] = [...required, ...(required.includes("proof_of_address") ? [] : (["proof_of_address"] as const))];
  const editable = vendorIsEditable(profile);
  const checks = vendorSubmissionChecks(profile, documents);
  const ready = checks.every((check) => check.done);

  return (
    <>
      <PageHeader
        eyebrow="Step 2 of 3"
        title="Verification"
        description="We confirm the identity of every vendor before their trucks can take bookings. Your details are encrypted and only visible to our verification team."
      />
      <div className="mb-6">
        <VendorStatusBanner profile={profile} />
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader title="Identity details" description="The government-issued ID of the person responsible for this account." />
          <IdentityForm defaultType={profile.idDocumentType ?? ""} savedLast4={profile.idDocumentReferenceLast4} editable={editable} />
        </Card>

        <Card>
          <CardHeader title="Supporting documents" description="Upload clear, complete copies. Blurry or cropped documents slow down your review." />
          <ul className="divide-y divide-navy/10">
            {types.map((type) => {
              const document = latest.get(type);
              return (
                <li key={type} className="grid gap-4 py-5 first:pt-0 last:pb-0 lg:grid-cols-[1fr_1.2fr] lg:gap-8">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[16px] font-semibold text-navy">{DOCUMENT_TITLES[type]}</h3>
                      <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-navy/60">
                        {required.includes(type) ? "Required" : "Optional"}
                      </span>
                    </div>
                    <p className="mt-1 text-[14px] leading-relaxed text-navy/70">{DOCUMENT_HELP[type]}</p>
                    {document && (
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[14px]">
                        <StatusBadge status={document.status} map={DOCUMENT_STATUS} />
                        <a
                          href={`/files/vendor-documents/${document.id}`}
                          target="_blank"
                          rel="noopener"
                          className="font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4"
                        >
                          {document.fileName}
                        </a>
                        <span className="text-navy/60">Uploaded {formatDate(document.uploadedAt)}</span>
                      </div>
                    )}
                    {document?.status === "rejected" && document.rejectionReason && (
                      <p className="mt-2 text-[14px] text-[#912018]">Reason: {document.rejectionReason}</p>
                    )}
                  </div>
                  {editable && (
                    <DocumentUploadForm
                      action={uploadVendorDocumentAction}
                      hiddenFields={{ type }}
                      label={`Upload ${DOCUMENT_TITLES[type]}`}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        {editable ? (
          <Card>
            <CardHeader title="Submit for verification" description="Once submitted, your details are locked while our team reviews them." />
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <Checklist items={checks} />
              <SubmitReviewForm ready={ready} />
            </div>
          </Card>
        ) : (
          <Card>
            <CardHeader title="Next step" description="While we review your details, you can add your trucks." />
            <Link href="/vendor/trucks" className={buttonClasses("secondary")}>
              Go to trucks
            </Link>
          </Card>
        )}
      </div>
    </>
  );
}
