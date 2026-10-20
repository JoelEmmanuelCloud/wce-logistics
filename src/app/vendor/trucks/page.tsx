import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-classes";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatKg, labelFor, TRUCK_CATEGORIES, TRUCK_STATUS } from "@/lib/labels";
import { requireRole } from "@/server/auth/dal";
import { listTrucksForVendor, photoCounts } from "@/server/trucks";
import { findVendorProfileByUser } from "@/server/vendors";

export const metadata: Metadata = { title: "Trucks" };

export default async function VendorTrucksPage() {
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  const trucks = profile ? await listTrucksForVendor(profile.id) : [];
  const photos = await photoCounts(trucks.map((truck) => truck.id));
  const addTruck = (
    <Link href={profile ? "/vendor/trucks/new" : "/vendor/profile"} className={buttonClasses("primary")}>
      {profile ? "Add a truck" : "Complete your profile first"}
    </Link>
  );

  return (
    <>
      <PageHeader
        eyebrow="Fleet"
        title="Trucks"
        description="Each truck is reviewed on its own. Only active trucks from verified vendors can take bookings."
        action={trucks.length > 0 ? addTruck : undefined}
      />
      {trucks.length === 0 ? (
        <EmptyState
          title="No trucks yet"
          description="Register your first truck with its documents and photos. You can add as many trucks as you manage."
          action={addTruck}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {trucks.map((truck) => (
            <li key={truck.id}>
              <Link
                href={`/vendor/trucks/${truck.id}`}
                className="group flex h-full flex-col justify-between gap-6 rounded-[24px] border border-navy/10 bg-white p-6 transition-colors hover:border-navy/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-display text-[28px] uppercase leading-none text-navy">{truck.registrationNumber}</p>
                    <StatusBadge status={truck.listingStatus} map={TRUCK_STATUS} />
                  </div>
                  <p className="mt-2 text-[15px] text-navy/70">
                    {truck.make} {truck.model}
                    {truck.year ? `, ${truck.year}` : ""}
                  </p>
                </div>
                <dl className="grid grid-cols-3 gap-3 border-t border-navy/10 pt-4 text-[13px]">
                  <div>
                    <dt className="text-navy/60">Type</dt>
                    <dd className="mt-0.5 font-semibold text-navy">{labelFor(TRUCK_CATEGORIES, truck.category).replace(" truck", "")}</dd>
                  </div>
                  <div>
                    <dt className="text-navy/60">Payload</dt>
                    <dd className="mt-0.5 font-semibold text-navy">{formatKg(truck.maxPayloadKg)}</dd>
                  </div>
                  <div>
                    <dt className="text-navy/60">Photos</dt>
                    <dd className="mt-0.5 font-semibold text-navy">{photos.get(truck.id) ?? 0}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
