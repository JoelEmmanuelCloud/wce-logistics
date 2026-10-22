import type { Metadata } from "next";
import Link from "next/link";
import { RatingSummary, Stars } from "@/components/reviews/star-rating";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { formatDateTime } from "@/lib/labels";
import { requireRole } from "@/server/auth/dal";
import { listReviews, vendorRatings } from "@/server/reviews";
import { findVendorProfileByUser } from "@/server/vendors";

export const metadata: Metadata = { title: "Reviews" };

export default async function VendorReviewsPage() {
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  const [rows, ratings] = profile ? await Promise.all([listReviews({ vendorId: profile.id }), vendorRatings([profile.id])]) : [[], new Map()];
  const rating = profile ? ratings.get(profile.id) : undefined;

  return (
    <>
      <PageHeader title="Reviews" description="Shippers rate each completed booking. Your rating is shown next to every trip you offer." />
      <Card className="mb-6">
        <RatingSummary average={rating?.average ?? 0} count={rating?.count ?? 0} />
      </Card>
      {rows.length === 0 ? (
        <EmptyState title="No reviews yet" description="Reviews appear here after shippers confirm their deliveries." />
      ) : (
        <ul className="grid gap-3">
          {rows.map(({ review, bookingReference, customerName }) => (
            <li key={review.id} className="rounded-lg border border-navy/10 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-navy">
                  <Stars value={review.rating} /> {review.rating} out of 5
                </span>
                <span className="text-[13px] text-navy/70">{formatDateTime(review.createdAt)}</span>
              </div>
              {review.comment && <p className="mt-2 text-[15px] text-navy/85">{review.comment}</p>}
              <p className="mt-2 text-[13px] text-navy/70">
                {customerName ?? "Shipper"},{" "}
                <Link href={`/vendor/bookings/${review.bookingId}`} className="underline decoration-orange decoration-2 underline-offset-4">
                  {bookingReference}
                </Link>
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
