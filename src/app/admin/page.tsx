import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, TRUCK_STATUS, VERIFICATION_STATUS } from "@/lib/labels";
import { adminStats, listTrucksForAdmin, listVendorsForAdmin } from "@/server/admin";
import { requireRole } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Overview" };

function Stat({ label, value, href, tone = "default" }: { label: string; value: number; href: string; tone?: "default" | "attention" }) {
  return (
    <Link
      href={href}
      className={`rounded-[20px] border p-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange ${
        tone === "attention" && value > 0 ? "border-orange-ink/40 bg-orange/[0.07] hover:border-orange-ink" : "border-navy/10 bg-white hover:border-navy/30"
      }`}
    >
      <p className="text-[13px] font-semibold text-navy/70">{label}</p>
      <p className="mt-2 font-display text-[44px] leading-none text-navy">{value}</p>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  await requireRole("admin");
  const [stats, vendorQueue, truckQueue] = await Promise.all([
    adminStats(),
    listVendorsForAdmin({ filter: "awaiting", query: "", page: 1 }),
    listTrucksForAdmin({ filter: "awaiting", query: "", page: 1 }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Operations" title="Overview" description="Review queues and the health of the vendor network." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Vendors awaiting review" value={stats.vendorsAwaiting} href="/admin/vendors?status=awaiting" tone="attention" />
        <Stat label="Trucks awaiting review" value={stats.trucksAwaiting} href="/admin/trucks?status=awaiting" tone="attention" />
        <Stat label="Documents expiring in 30 days" value={stats.documentsExpiringSoon} href="/admin/trucks?status=active" tone="attention" />
        <Stat label="Trucks with expired documents" value={stats.trucksExpired} href="/admin/trucks?status=expired" tone="attention" />
        <Stat label="Verified vendors" value={stats.vendorsVerified} href="/admin/vendors?status=verified" />
        <Stat label="Active trucks" value={stats.trucksActive} href="/admin/trucks?status=active" />
        <Stat label="Suspended vendors" value={stats.vendorsSuspended} href="/admin/vendors?status=suspended" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Vendor queue" description="Oldest submissions are listed last." />
          {vendorQueue.rows.length === 0 ? (
            <p className="text-[15px] text-navy/60">No vendors are waiting for review.</p>
          ) : (
            <ul className="divide-y divide-navy/10">
              {vendorQueue.rows.slice(0, 6).map(({ vendor }) => (
                <li key={vendor.id}>
                  <Link href={`/admin/vendors/${vendor.id}`} className="flex items-center justify-between gap-4 py-3 hover:text-orange-ink">
                    <span>
                      <span className="block font-semibold text-navy">{vendor.businessName ?? vendor.legalName}</span>
                      <span className="text-[13px] text-navy/60">Submitted {formatDateTime(vendor.submittedAt)}</span>
                    </span>
                    <StatusBadge status={vendor.verificationStatus} map={VERIFICATION_STATUS} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Truck queue" description="Trucks submitted for verification." />
          {truckQueue.rows.length === 0 ? (
            <p className="text-[15px] text-navy/60">No trucks are waiting for review.</p>
          ) : (
            <ul className="divide-y divide-navy/10">
              {truckQueue.rows.slice(0, 6).map(({ truck, vendorName }) => (
                <li key={truck.id}>
                  <Link href={`/admin/trucks/${truck.id}`} className="flex items-center justify-between gap-4 py-3 hover:text-orange-ink">
                    <span>
                      <span className="block font-semibold text-navy">{truck.registrationNumber}</span>
                      <span className="text-[13px] text-navy/60">
                        {vendorName}, submitted {formatDateTime(truck.submittedAt)}
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
    </>
  );
}
