import type { Metadata } from "next";
import Link from "next/link";
import { DataTable, FilterTabs, Pagination, SearchForm } from "@/components/admin/list-controls";
import { PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatKg, labelFor, TRUCK_CATEGORIES, TRUCK_STATUS, VERIFICATION_STATUS } from "@/lib/labels";
import { listTrucksForAdmin, parsePage, parseQuery, TRUCK_FILTERS, type TruckFilter } from "@/server/admin";
import { requireRole } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Trucks" };

export default async function AdminTrucksPage({ searchParams }: PageProps<"/admin/trucks">) {
  await requireRole("admin");
  const params = await searchParams;
  const status = (typeof params.status === "string" && params.status in TRUCK_FILTERS ? params.status : "awaiting") as TruckFilter;
  const query = parseQuery(params.q);
  const page = parsePage(params.page);
  const result = await listTrucksForAdmin({ filter: status, query, page });

  return (
    <>
      <PageHeader eyebrow="Compliance" title="Trucks" description="Check each truck's documents and photos before it can take bookings." />
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs base="/admin/trucks" filters={TRUCK_FILTERS} active={status} query={query} />
        <SearchForm base="/admin/trucks" status={status} query={query} placeholder="Registration or vendor" />
      </div>
      <DataTable caption="Trucks" headers={["Registration", "Vendor", "Category", "Payload", "Base", "Submitted", "Status"]}>
        {result.rows.length === 0 ? (
          <tr>
            <td colSpan={7} className="px-4 py-10 text-center text-navy/70">
              No trucks match this view.
            </td>
          </tr>
        ) : (
          result.rows.map(({ truck, vendorName, vendorStatus }) => (
            <tr key={truck.id} className="hover:bg-navy/[0.02]">
              <td className="px-4 py-3">
                <Link href={`/admin/trucks/${truck.id}`} className="font-semibold text-navy underline-offset-4 hover:underline">
                  {truck.registrationNumber}
                </Link>
                <span className="block text-[13px] text-navy/70">
                  {truck.make} {truck.model}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="block text-navy">{vendorName}</span>
                <StatusBadge status={vendorStatus} map={VERIFICATION_STATUS} />
              </td>
              <td className="px-4 py-3 text-navy/80">{labelFor(TRUCK_CATEGORIES, truck.category)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-navy/80">{formatKg(truck.maxPayloadKg)}</td>
              <td className="px-4 py-3 text-navy/80">
                {truck.baseCity}, {truck.baseState}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-navy/80">{truck.submittedAt ? formatDate(truck.submittedAt) : "Not submitted"}</td>
              <td className="px-4 py-3">
                <StatusBadge status={truck.listingStatus} map={TRUCK_STATUS} />
              </td>
            </tr>
          ))
        )}
      </DataTable>
      <Pagination base="/admin/trucks" page={result.page} pageCount={result.pageCount} total={result.total} params={{ status, q: query }} />
    </>
  );
}
