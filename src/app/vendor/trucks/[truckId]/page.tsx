import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { archiveTruckAction, deleteTruckPhotoAction, setTruckAvailabilityAction, updateTruckAction } from "@/app/vendor/trucks/actions";
import { TruckForm } from "@/app/vendor/trucks/truck-form";
import { Checklist } from "@/components/app/checklist";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DOCUMENT_STATUS, formatDate, TRUCK_DOCUMENT_TYPES, TRUCK_STATUS } from "@/lib/labels";
import { requireRole } from "@/server/auth/dal";
import {
  DETAILS_EDITABLE_STATUSES,
  DOCUMENTS_EDITABLE_STATUSES,
  documentIsCurrent,
  findVendorTruck,
  latestTruckDocuments,
  listTruckDocuments,
  listTruckPhotos,
  MAX_TRUCK_PHOTOS,
  MIN_TRUCK_PHOTOS,
  REQUIRED_TRUCK_DOCUMENTS,
  todayIso,
  truckSubmissionChecks,
} from "@/server/trucks";
import { truckFormPolicy } from "@/server/settings";
import { findVendorProfileByUser } from "@/server/vendors";
import { SubmitTruckForm, TruckDocumentUpload, TruckPhotoUpload } from "./truck-uploads";

export const metadata: Metadata = { title: "Truck" };

function StatusNotice({ status, reviewNote, vendorVerified }: { status: string; reviewNote: string | null; vendorVerified: boolean }) {
  if (status === "draft" && reviewNote) {
    return (
      <Alert tone="warning" title="Changes requested">
        {reviewNote}
      </Alert>
    );
  }
  if (status === "pending_verification") {
    return (
      <Alert tone="info" title="Under review">
        Our team is checking this truck and its documents.{!vendorVerified && " Approval also needs your vendor verification to be complete."}
      </Alert>
    );
  }
  if (status === "suspended") {
    return (
      <Alert tone="error" title="Suspended">
        {reviewNote ?? "This truck was suspended by our team."} Contact support to resolve this.
      </Alert>
    );
  }
  if (status === "expired_documentation") {
    return (
      <Alert tone="warning" title="Documents expired">
        Upload current documents below. The truck becomes bookable again once they are approved.
      </Alert>
    );
  }
  return null;
}

export default async function TruckDetailPage({ params }: PageProps<"/vendor/trucks/[truckId]">) {
  const { truckId } = await params;
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  if (!profile) {
    redirect("/vendor/profile");
  }
  const truck = /^[0-9a-f-]{36}$/i.test(truckId) ? await findVendorTruck(profile.id, truckId) : null;
  if (!truck) {
    redirect("/vendor/trucks");
  }

  const [documents, photos, formPolicy] = await Promise.all([listTruckDocuments(truck.id), listTruckPhotos(truck.id), truckFormPolicy(truck)]);
  const latest = latestTruckDocuments(documents);
  const today = todayIso();
  const checks = truckSubmissionChecks(documents, photos);
  const detailsEditable = DETAILS_EDITABLE_STATUSES.includes(truck.listingStatus);
  const documentsEditable = DOCUMENTS_EDITABLE_STATUSES.includes(truck.listingStatus);
  const canDeletePhotos = documentsEditable && (truck.listingStatus === "draft" || photos.length > MIN_TRUCK_PHOTOS);

  return (
    <>
      <Link href="/vendor/trucks" className="text-[14px] font-semibold text-navy/70 hover:text-navy">
        Back to trucks
      </Link>
      <PageHeader
        eyebrow={`${truck.make} ${truck.model}`}
        title={truck.registrationNumber}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={truck.listingStatus} map={TRUCK_STATUS} />
            {(truck.listingStatus === "active" || truck.listingStatus === "unavailable") && (
              <form action={setTruckAvailabilityAction}>
                <input type="hidden" name="truckId" value={truck.id} />
                <input type="hidden" name="available" value={truck.listingStatus === "unavailable" ? "true" : "false"} />
                <button type="submit" className={buttonClasses("outline", "sm")}>
                  {truck.listingStatus === "active" ? "Mark unavailable" : "Mark available"}
                </button>
              </form>
            )}
          </div>
        }
      />

      <div className="grid gap-6">
        <StatusNotice status={truck.listingStatus} reviewNote={truck.reviewNote} vendorVerified={profile.verificationStatus === "verified"} />

        {truck.listingStatus === "draft" && (
          <Card>
            <CardHeader title="Submit for review" description="Once every item is complete, submit the truck. It stays in draft until you do." />
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <Checklist items={checks} />
              <SubmitTruckForm truckId={truck.id} ready={checks.every((check) => check.done)} />
            </div>
          </Card>
        )}

        <Card>
          <CardHeader title="Vehicle documents" description="Required documents must be current. We flag trucks automatically when a document expires." />
          <ul className="divide-y divide-navy/10">
            {TRUCK_DOCUMENT_TYPES.map((option) => {
              const document = latest.get(option.value);
              const expired = document?.expiryDate ? document.expiryDate <= today : false;
              return (
                <li key={option.value} className="grid gap-4 py-5 first:pt-0 last:pb-0 lg:grid-cols-[1fr_1.2fr] lg:gap-8">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[16px] font-semibold text-navy">{option.label}</h3>
                      <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-navy/70">
                        {REQUIRED_TRUCK_DOCUMENTS.includes(option.value) ? "Required" : "Optional"}
                      </span>
                    </div>
                    {document ? (
                      <div className="mt-3 grid gap-2 text-[14px]">
                        <div className="flex flex-wrap items-center gap-3">
                          <StatusBadge status={expired ? "expired" : document.status} map={{ ...DOCUMENT_STATUS, expired: { label: "Expired", tone: "danger" } }} />
                          <a
                            href={`/files/truck-documents/${document.id}`}
                            target="_blank"
                            rel="noopener"
                            className="font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4"
                          >
                            {document.fileName}
                          </a>
                        </div>
                        {document.expiryDate && (
                          <p className={documentIsCurrent(document, today) ? "text-navy/70" : "font-semibold text-[#912018]"}>
                            Expires {formatDate(document.expiryDate)}
                          </p>
                        )}
                        {document.status === "rejected" && document.rejectionReason && (
                          <p className="text-[#912018]">Reason: {document.rejectionReason}</p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 text-[14px] text-navy/70">Not uploaded yet.</p>
                    )}
                  </div>
                  {documentsEditable && <TruckDocumentUpload truckId={truck.id} type={option.value} label={option.label} expires={option.expires} />}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Photos"
            description={`Add ${MIN_TRUCK_PHOTOS} to ${MAX_TRUCK_PHOTOS} clear photos showing the cab, the cargo body and the number plate.`}
          />
          {photos.length > 0 && (
            <ul className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {photos.map((photo, index) => (
                <li key={photo.id} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-navy/5">
                  <Image
                    src={`/files/truck-photos/${photo.id}`}
                    alt={`Photo ${index + 1} of ${truck.registrationNumber}`}
                    fill
                    sizes="(min-width: 768px) 25vw, 50vw"
                    className="object-cover"
                  />
                  {canDeletePhotos && (
                    <form action={deleteTruckPhotoAction} className="absolute right-2 top-2">
                      <input type="hidden" name="truckId" value={truck.id} />
                      <input type="hidden" name="photoId" value={photo.id} />
                      <button
                        type="submit"
                        className="rounded-full bg-white/90 px-3 py-1 text-[12px] font-semibold text-[#912018] shadow-sm hover:bg-white"
                        aria-label={`Remove photo ${index + 1}`}
                      >
                        Remove
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          {documentsEditable && photos.length < MAX_TRUCK_PHOTOS && <TruckPhotoUpload truckId={truck.id} />}
        </Card>

        <Card>
          <CardHeader
            title="Truck details"
            description={
              detailsEditable && truck.listingStatus !== "draft"
                ? "Changing details on an approved truck sends it back for review before it can take bookings."
                : undefined
            }
          />
          <TruckForm
            action={updateTruckAction.bind(null, truck.id)}
            categoryOptions={formPolicy.categoryOptions}
            cargoOptions={formPolicy.cargoOptions}
            disabled={!detailsEditable}
            submitLabel="Save details"
            defaults={{
              registrationNumber: truck.registrationNumber,
              make: truck.make,
              model: truck.model,
              year: truck.year?.toString() ?? "",
              category: truck.category,
              tyreCount: truck.tyreCount.toString(),
              maxPayloadKg: truck.maxPayloadKg.toString(),
              bodyType: truck.bodyType,
              bodyLengthM: truck.bodyLengthM ?? "",
              bodyWidthM: truck.bodyWidthM ?? "",
              bodyHeightM: truck.bodyHeightM ?? "",
              cargoTypes: truck.cargoTypes,
              baseState: truck.baseState,
              baseCity: truck.baseCity,
            }}
          />
        </Card>

        {truck.listingStatus !== "pending_verification" && truck.listingStatus !== "suspended" && (
          <Card tone="danger">
            <CardHeader title="Archive truck" description="Archived trucks are removed from your fleet and can no longer be booked. This keeps their history for our records." />
            <form action={archiveTruckAction}>
              <input type="hidden" name="truckId" value={truck.id} />
              <button type="submit" className={buttonClasses("danger", "sm")}>
                Archive this truck
              </button>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}
