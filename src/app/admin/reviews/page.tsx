import type { Metadata } from "next";
import Link from "next/link";
import { setReviewStatusAction } from "@/app/admin/reviews/actions";
import { ReasonActionForm } from "@/components/marketplace/reason-action-form";
import { Stars } from "@/components/reviews/star-rating";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, REVIEW_STATUS } from "@/lib/labels";
import { requireRole } from "@/server/auth/dal";
import { listReviews } from "@/server/reviews";

export const metadata: Metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  await requireRole("admin");
  const rows = await listReviews();

  return (
    <>
      <PageHeader
        eyebrow="Marketplace"
        title="Reviews"
        description="Hide reviews that are abusive, contain personal information or are not about the delivery. Hidden reviews no longer count towards a vendor's rating."
      />
      {rows.length === 0 ? (
        <EmptyState title="No reviews yet" description="Shippers can review a booking once it is completed." />
      ) : (
        <ul className="grid gap-3">
          {rows.map(({ review, bookingReference, customerName, vendorName }) => (
            <li key={review.id} className="grid gap-4 rounded-[20px] border border-navy/10 bg-white p-5 md:grid-cols-[1fr_auto] md:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-navy">
                    <Stars value={review.rating} /> {review.rating} out of 5
                  </span>
                  <StatusBadge status={review.status} map={REVIEW_STATUS} />
                </div>
                {review.comment && <p className="mt-2 text-[15px] text-navy/85">{review.comment}</p>}
                <p className="mt-2 text-[13px] text-navy/70">
                  {customerName ?? "Shipper"} about {vendorName},{" "}
                  <Link href={`/admin/bookings/${review.bookingId}`} className="underline decoration-orange decoration-2 underline-offset-4">
                    {bookingReference}
                  </Link>
                  , {formatDateTime(review.createdAt)}
                </p>
                {review.moderationNote && <p className="mt-1 text-[13px] text-navy/70">Moderation note: {review.moderationNote}</p>}
              </div>
              <ReasonActionForm
                action={setReviewStatusAction.bind(null, review.id, review.status === "published" ? "hidden" : "published")}
                trigger={review.status === "published" ? "Hide" : "Publish again"}
                confirmLabel={review.status === "published" ? "Hide review" : "Publish review"}
                reasonLabel="Reason"
                variant={review.status === "published" ? "danger" : "secondary"}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
