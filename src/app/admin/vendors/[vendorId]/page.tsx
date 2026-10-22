import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { decideVendorAction, reviewVendorDocumentAction, setVendorSuspensionAction } from "@/app/admin/actions";
import { AuditTimeline } from "@/components/admin/audit-timeline";
import { DecisionPanel } from "@/components/admin/decision-panel";
import { DocumentReview } from "@/components/admin/document-review";
import { RevealId } from "@/components/admin/reveal-id";
import { Card, CardHeader, DescriptionList, PageHeader } from "@/components/ui/card";
import { EmailLink, PhoneLink } from "@/components/ui/contact-link";
import { StatusBadge } from "@/components/ui/status-badge";
import { DOCUMENT_STATUS, formatDate, formatDateTime, ID_DOCUMENT_TYPES, labelFor, TRUCK_STATUS, VENDOR_CATEGORIES, VERIFICATION_STATUS } from "@/lib/labels";
import { getVendorForAdmin, listAuditLogs } from "@/server/admin";
import { requireRole } from "@/server/auth/dal";
import { DOCUMENT_TITLES, requiredVendorDocuments } from "@/server/vendors";

export const metadata: Metadata = { title: "Vendor review" };

export default async function AdminVendorPage({ params }: PageProps<"/admin/vendors/[vendorId]">) {
  await requireRole("admin");
  const { vendorId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(vendorId)) {
    notFound();
  }
  const data = await getVendorForAdmin(vendorId);
  if (!data) {
    notFound();
  }
  const { vendor, user, documents, trucks } = data;
  const history = await listAuditLogs({ page: 1, entityId: vendor.id });
  const required = requiredVendorDocuments(vendor.category);
  const awaiting = vendor.verificationStatus === "submitted" || vendor.verificationStatus === "under_review";

  return (
    <>
      <Link href="/admin/vendors" className="text-[14px] font-semibold text-navy/70 hover:text-navy">
        Back to vendors
      </Link>
      <PageHeader
        description={labelFor(VENDOR_CATEGORIES, vendor.category)}
        title={vendor.businessName ?? vendor.legalName}
        action={<StatusBadge status={vendor.verificationStatus} map={VERIFICATION_STATUS} />}
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="Profile" />
            <DescriptionList
              items={[
                { label: "Legal name", value: vendor.legalName },
                { label: "Business name", value: vendor.businessName },
                { label: "Sign-in email", value: <EmailLink email={user.email} /> },
                { label: "Account phone", value: <PhoneLink phone={user.phone} /> },
                { label: "Business email", value: <EmailLink email={vendor.email} /> },
                { label: "Address", value: `${vendor.addressLine}, ${vendor.city}, ${vendor.state}` },
                { label: "CAC number", value: vendor.cacNumber },
                { label: "Operating states", value: vendor.operatingStates.join(", ") },
                { label: "Registered", value: formatDate(vendor.createdAt) },
              ]}
            />
          </Card>

          <Card>
            <CardHeader title="Identity" description="ID numbers are encrypted at rest. Revealing one is recorded in the audit log." />
            <DescriptionList
              items={[
                { label: "ID type", value: vendor.idDocumentType ? labelFor(ID_DOCUMENT_TYPES, vendor.idDocumentType) : null },
                { label: "ID number", value: <RevealId vendorId={vendor.id} last4={vendor.idDocumentReferenceLast4} /> },
              ]}
            />
          </Card>

          <Card>
            <CardHeader title="Documents" description="The latest upload for each type is shown first." />
            {documents.length === 0 ? (
              <p className="text-[15px] text-navy/70">No documents uploaded.</p>
            ) : (
              <ul className="divide-y divide-navy/10">
                {documents.map((document) => (
                  <li key={document.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[1fr_auto] md:items-start">
                    <div>
                      <p className="font-semibold text-navy">
                        {DOCUMENT_TITLES[document.type]}
                        {required.includes(document.type) && <span className="ml-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-navy/70">Required</span>}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[14px]">
                        <StatusBadge status={document.status} map={DOCUMENT_STATUS} />
                        <a href={`/files/vendor-documents/${document.id}`} target="_blank" rel="noopener" className="font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4">
                          Open {document.fileName}
                        </a>
                        <span className="text-navy/70">{formatDateTime(document.uploadedAt)}</span>
                      </div>
                      {document.rejectionReason && <p className="mt-2 text-[14px] text-[#912018]">Reason: {document.rejectionReason}</p>}
                    </div>
                    <DocumentReview action={reviewVendorDocumentAction} documentId={document.id} status={document.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Trucks" description={`${trucks.length} registered`} />
            {trucks.length === 0 ? (
              <p className="text-[15px] text-navy/70">No trucks registered.</p>
            ) : (
              <ul className="divide-y divide-navy/10">
                {trucks.map((truck) => (
                  <li key={truck.id}>
                    <Link href={`/admin/trucks/${truck.id}`} className="flex items-center justify-between gap-4 py-3 hover:text-orange-ink">
                      <span className="font-semibold text-navy">
                        {truck.registrationNumber}
                        <span className="ml-2 font-normal text-navy/70">
                          {truck.make} {truck.model}
                        </span>
                      </span>
                      <StatusBadge status={truck.listingStatus} map={TRUCK_STATUS} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid content-start gap-6">
          {awaiting && (
            <Card tone="attention">
              <CardHeader title="Decision" description={`Submitted ${formatDateTime(vendor.submittedAt)}.`} />
              <DecisionPanel
                action={decideVendorAction.bind(null, vendor.id)}
                options={[
                  ...(vendor.verificationStatus === "submitted" ? [{ value: "start_review", label: "Start review", variant: "outline" as const }] : []),
                  { value: "approve", label: "Verify vendor", variant: "secondary" },
                  { value: "request_info", label: "Request information", variant: "outline" },
                  { value: "reject", label: "Decline", variant: "danger" },
                ]}
              />
            </Card>
          )}
          {(vendor.verificationStatus === "verified" || vendor.verificationStatus === "suspended") && (
            <Card>
              <CardHeader
                title={vendor.verificationStatus === "verified" ? "Suspend vendor" : "Reinstate vendor"}
                description={
                  vendor.verificationStatus === "verified"
                    ? "Suspended vendors cannot take bookings on any of their trucks."
                    : `Suspended: ${vendor.reviewNote ?? "no reason recorded"}`
                }
              />
              <DecisionPanel
                action={setVendorSuspensionAction.bind(null, vendor.id)}
                noteLabel={vendor.verificationStatus === "verified" ? "Reason for suspension" : "Note (optional)"}
                noteHint="Shown to the vendor and recorded in the audit log."
                options={
                  vendor.verificationStatus === "verified"
                    ? [{ value: "suspend", label: "Suspend vendor", variant: "danger" }]
                    : [{ value: "reinstate", label: "Reinstate vendor", variant: "secondary" }]
                }
              />
            </Card>
          )}
          {vendor.reviewNote && !awaiting && vendor.verificationStatus !== "suspended" && (
            <Card>
              <CardHeader title="Last review note" description={formatDateTime(vendor.reviewedAt)} />
              <p className="text-[15px] leading-relaxed text-navy">{vendor.reviewNote}</p>
            </Card>
          )}
          <Card>
            <CardHeader title="History" />
            <AuditTimeline entries={history.rows} />
          </Card>
        </div>
      </div>
    </>
  );
}
