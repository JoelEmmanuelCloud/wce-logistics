import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-classes";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { lagosToday } from "@/lib/dates";
import { DRIVER_STATUS, formatDate } from "@/lib/labels";
import { formatPhone } from "@/lib/phone";
import { requireRole } from "@/server/auth/dal";
import { listDrivers } from "@/server/drivers";
import { findVendorProfileByUser } from "@/server/vendors";

export const metadata: Metadata = { title: "Drivers" };

export default async function VendorDriversPage() {
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  const rows = profile ? await listDrivers(profile.id) : [];
  const today = lagosToday();
  const addDriver = (
    <Link href={profile ? "/vendor/drivers/new" : "/vendor/profile"} className={buttonClasses("primary")}>
      {profile ? "Add a driver" : "Complete your profile first"}
    </Link>
  );

  return (
    <>
      <PageHeader
        eyebrow="Fleet"
        title="Drivers"
        description="Assign a driver to every confirmed booking. Their licence must be valid and cover the truck they drive."
        action={rows.length > 0 ? addDriver : undefined}
      />
      {rows.length === 0 ? (
        <EmptyState title="No drivers yet" description="Add the drivers who carry your shipments. Each one signs in with their own email address." action={addDriver} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ driver, email }) => {
            const expired = driver.licenceExpiresOn < today;
            return (
              <li key={driver.id}>
                <Link
                  href={`/vendor/drivers/${driver.id}`}
                  className="flex h-full flex-col gap-4 rounded-[24px] border border-navy/10 bg-white p-6 transition-colors hover:border-navy/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[19px] font-semibold text-navy">{driver.fullName}</p>
                    <StatusBadge status={driver.status} map={DRIVER_STATUS} />
                  </div>
                  <div className="grid gap-1 text-[14px] text-navy/70">
                    <span>{formatPhone(driver.phone)}</span>
                    <span className="truncate">{email}</span>
                  </div>
                  <p className={`border-t border-navy/10 pt-3 text-[13px] font-medium ${expired ? "text-[#B42318]" : "text-navy/80"}`}>
                    Class {driver.licenceClass} licence, {expired ? "expired" : "valid until"} {formatDate(driver.licenceExpiresOn)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
