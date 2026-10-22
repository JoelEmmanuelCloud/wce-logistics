import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { addDays, lagosToday } from "@/lib/dates";
import { MAX_BOOKING_HORIZON_DAYS } from "@/lib/validation/marketplace";
import { requireRole } from "@/server/auth/dal";
import { listTrucksForVendor } from "@/server/trucks";
import { findVendorProfileByUser } from "@/server/vendors";
import { RouteForm } from "./route-form";

export const metadata: Metadata = { title: "Schedule a trip" };

export default async function NewRoutePage() {
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  if (!profile) {
    redirect("/vendor/profile");
  }
  const trucks = (await listTrucksForVendor(profile.id)).filter((truck) => truck.listingStatus === "active" || truck.listingStatus === "unavailable");
  const today = lagosToday();

  return (
    <>
      <Link href="/vendor/routes" className="text-[14px] font-semibold text-navy/70 hover:text-navy">
        Back to trips
      </Link>
      <PageHeader
        title="Schedule a trip"
        description="Publish a trip your truck is already making. Shippers going the same way can book the space you offer."
      />
      {profile.verificationStatus !== "verified" ? (
        <EmptyState
          title="Verification needed"
          description="Trips can be published once our team has verified your vendor account."
          action={
            <Link href="/vendor/verification" className={buttonClasses("primary")}>
              View verification
            </Link>
          }
        />
      ) : trucks.length === 0 ? (
        <EmptyState
          title="No approved trucks"
          description="Trips need a truck that has passed review. Add a truck and submit it for review first."
          action={
            <Link href="/vendor/trucks" className={buttonClasses("primary")}>
              Go to trucks
            </Link>
          }
        />
      ) : (
        <Card>
          <RouteForm
            minDate={today}
            maxDate={addDays(today, MAX_BOOKING_HORIZON_DAYS)}
            trucks={trucks.map((truck) => ({
              id: truck.id,
              label: `${truck.registrationNumber} (${truck.make} ${truck.model})`,
              payloadKg: truck.maxPayloadKg,
              baseState: truck.baseState,
              baseCity: truck.baseCity,
            }))}
          />
        </Card>
      )}
    </>
  );
}
