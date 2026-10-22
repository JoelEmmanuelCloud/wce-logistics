import type { Metadata } from "next";
import Link from "next/link";
import { DataTable, FilterTabs } from "@/components/admin/list-controls";
import { PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DISPUTE_CATEGORIES, DISPUTE_STATUS, formatDateTime, labelFor } from "@/lib/labels";
import { requireRole } from "@/server/auth/dal";
import { disputeRole, listDisputes } from "@/server/disputes";

export const metadata: Metadata = { title: "Disputes" };

const FILTERS = { active: { label: "Open" }, closed: { label: "Closed" } } as const;

export default async function AdminDisputesPage({ searchParams }: PageProps<"/admin/disputes">) {
  await requireRole("admin");
  const params = await searchParams;
  const scope = params.status === "closed" ? "closed" : "active";
  const rows = await listDisputes(scope);

  return (
    <>
      <PageHeader
        eyebrow="Support"
        title="Disputes"
        description="Problems reported by shippers and vendors. Vendor payouts for a booking stay on hold while its dispute is open."
      />
      <div className="mb-5">
        <FilterTabs base="/admin/disputes" filters={FILTERS} active={scope} query="" />
      </div>
      <DataTable caption="Disputes" headers={["Booking", "Problem", "Opened by", "Vendor", "Opened", "Status"]}>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-4 py-10 text-center text-navy/70">
              {scope === "active" ? "No open disputes." : "No closed disputes yet."}
            </td>
          </tr>
        ) : (
          rows.map(({ dispute, bookingReference, openedByName, vendorName }) => (
            <tr key={dispute.id} className="align-top hover:bg-navy/[0.02]">
              <td className="px-4 py-3">
                <Link href={`/admin/disputes/${dispute.id}`} className="font-semibold text-navy underline-offset-4 hover:underline">
                  {bookingReference}
                </Link>
              </td>
              <td className="px-4 py-3 text-navy">{labelFor(DISPUTE_CATEGORIES, dispute.category)}</td>
              <td className="px-4 py-3 text-navy/80">
                {openedByName ?? "Unknown"}
                <span className="block text-[12px] text-navy/70">{disputeRole(dispute.openedByRole)}</span>
              </td>
              <td className="px-4 py-3 text-navy/80">{vendorName}</td>
              <td className="px-4 py-3 whitespace-nowrap text-navy/80">{formatDateTime(dispute.createdAt)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={dispute.status} map={DISPUTE_STATUS} />
                {!dispute.assignedTo && scope === "active" && <span className="mt-1 block text-[12px] text-navy/70">Unassigned</span>}
              </td>
            </tr>
          ))
        )}
      </DataTable>
    </>
  );
}
