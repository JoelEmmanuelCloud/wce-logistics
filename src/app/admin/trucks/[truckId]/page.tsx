import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { decideTruckAction, reviewTruckDocumentAction } from "@/app/admin/actions";
import { AuditTimeline } from "@/components/admin/audit-timeline";
import { DecisionPanel } from "@/components/admin/decision-panel";
import { DocumentReview } from "@/components/admin/document-review";
import { Checklist } from "@/components/app/checklist";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader, DescriptionList, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { BODY_TYPES, DOCUMENT_STATUS, formatDate, formatDateTime, formatKg, labelFor, TRUCK_CATEGORIES, TRUCK_STATUS, VERIFICATION_STATUS } from "@/lib/labels";
import { getTruckForAdmin, listAuditLogs } from "@/server/admin";
import { requireRole } from "@/server/auth/dal";
import { cargoLabels } from "@/server/settings";
import { REQUIRED_TRUCK_DOCUMENTS, todayIso, TRUCK_DOCUMENT_TITLES, truckSubmissionChecks } from "@/server/trucks";

export const metadata: Metadata = { title: "Truck review" };

function dimensions(length: string | null, width: string | null, height: string | null): string | null {
  if (!length && !width && !height) {
    return null;
  }
  return `${length ?? "?"} m long, ${width ?? "?"} m wide, ${height ?? "?"} m high`;
}

export default async function AdminTruckPage({ params }: PageProps<"/admin/trucks/[truckId]">) {
  await requireRole("admin");
  const { truckId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(truckId)) {
    notFound();
  }
  const data = await getTruckForAdmin(truckId);
  if (!data) {
    notFound();
  }
  const { truck, vendor, documents, photos } = data;
  const [history, cargo] = await Promise.all([listAuditLogs({ page: 1, entityId: truck.id }), cargoLabels()]);
  const checks = truckSubmissionChecks(documents, photos);
  const today = todayIso();

  const options =
    truck.listingStatus === "pending_verification"
      ? [
          { value: "approve", label: "Approve truck", variant: "secondary" as const },
          { value: "request_changes", label: "Request changes", variant: "outline" as const },
          { value: "suspend", label: "Suspend", variant: "danger" as const },
        ]
      : truck.listingStatus === "suspended"
        ? [{ value: "reinstate", label: "Reinstate truck", variant: "secondary" as const }]
        : truck.listingStatus === "archived"
          ? []
          : [{ value: "suspend", label: "Suspend truck", variant: "danger" as const }];

  return (
    <>
      <Link href="/admin/trucks" className="text-[14px] font-semibold text-navy/70 hover:text-navy">
        Back to trucks
      </Link>
      <PageHeader
        eyebrow={`${truck.make} ${truck.model}${truck.year ? `, ${truck.year}` : ""}`}
        title={truck.registrationNumber}
        action={<StatusBadge status={truck.listingStatus} map={TRUCK_STATUS} />}
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="Specification" />
            <DescriptionList
              items={[
                { label: "Category", value: labelFor(TRUCK_CATEGORIES, truck.category) },
                { label: "Body type", value: labelFor(BODY_TYPES, truck.bodyType) },
                { label: "Maximum payload", value: formatKg(truck.maxPayloadKg) },
                { label: "Tyres", value: truck.tyreCount },
                { label: "Body dimensions", value: dimensions(truck.bodyLengthM, truck.bodyWidthM, truck.bodyHeightM) },
                { label: "Base", value: `${truck.baseCity}, ${truck.baseState}` },
                { label: "Cargo types", value: truck.cargoTypes.map((type) => cargo.get(type) ?? labelFor([], type)).join(", ") },
                { label: "Registered", value: formatDate(truck.createdAt) },
              ]}
            />
          </Card>

          <Card>
            <CardHeader title="Documents" description="Check each document matches the registration number and is current." />
            {documents.length === 0 ? (
              <p className="text-[15px] text-navy/70">No documents uploaded.</p>
            ) : (
              <ul className="divide-y divide-navy/10">
                {documents.map((document) => {
                  const expired = Boolean(document.expiryDate && document.expiryDate <= today);
                  return (
                    <li key={document.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[1fr_auto] md:items-start">
                      <div>
                        <p className="font-semibold text-navy">
                          {TRUCK_DOCUMENT_TITLES[document.type]}
                          {REQUIRED_TRUCK_DOCUMENTS.includes(document.type) && (
                            <span className="ml-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-navy/70">Required</span>
                          )}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[14px]">
                          <StatusBadge status={document.status} map={DOCUMENT_STATUS} />
                          <a href={`/files/truck-documents/${document.id}`} target="_blank" rel="noopener" className="font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4">
                            Open {document.fileName}
                          </a>
                        </div>
                        <p className={`mt-1 text-[14px] ${expired ? "font-semibold text-[#912018]" : "text-navy/70"}`}>
                          {document.issueDate && `Issued ${formatDate(document.issueDate)}. `}
                          {document.expiryDate ? `${expired ? "Expired" : "Expires"} ${formatDate(document.expiryDate)}.` : "No expiry date."}
                        </p>
                        {document.rejectionReason && <p className="mt-1 text-[14px] text-[#912018]">Reason: {document.rejectionReason}</p>}
                      </div>
                      <DocumentReview action={reviewTruckDocumentAction} documentId={document.id} status={document.status} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Photos" description={`${photos.length} uploaded`} />
            {photos.length === 0 ? (
              <p className="text-[15px] text-navy/70">No photos uploaded.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {photos.map((photo, index) => (
                  <li key={photo.id} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-navy/5">
                    <a href={`/files/truck-photos/${photo.id}`} target="_blank" rel="noopener" className="block size-full">
                      <Image src={`/files/truck-photos/${photo.id}`} alt={`Photo ${index + 1} of ${truck.registrationNumber}`} fill sizes="(min-width: 768px) 20vw, 50vw" className="object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="Vendor" />
            <Link href={`/admin/vendors/${vendor.id}`} className="font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4">
              {vendor.businessName ?? vendor.legalName}
            </Link>
            <div className="mt-2">
              <StatusBadge status={vendor.verificationStatus} map={VERIFICATION_STATUS} />
            </div>
          </Card>

          {options.length > 0 && (
            <Card tone={truck.listingStatus === "pending_verification" ? "attention" : "light"}>
              <CardHeader title="Decision" description={truck.submittedAt ? `Submitted ${formatDateTime(truck.submittedAt)}.` : undefined} />
              {truck.listingStatus === "pending_verification" && (
                <div className="mb-5 grid gap-4">
                  {vendor.verificationStatus !== "verified" && (
                    <Alert tone="warning" title="Vendor not verified">
                      Verify the vendor before approving this truck.
                    </Alert>
                  )}
                  <Checklist items={checks} />
                </div>
              )}
              <DecisionPanel
                action={decideTruckAction.bind(null, truck.id)}
                options={options}
                noteHint="Required when requesting changes or suspending. The vendor will see this note."
              />
            </Card>
          )}

          {truck.reviewNote && (
            <Card>
              <CardHeader title="Last review note" description={formatDateTime(truck.reviewedAt)} />
              <p className="text-[15px] leading-relaxed text-navy">{truck.reviewNote}</p>
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
