import type { Metadata } from "next";
import Link from "next/link";
import { DataTable, FilterTabs, Pagination, SearchForm } from "@/components/admin/list-controls";
import { PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, labelFor, VENDOR_CATEGORIES, VERIFICATION_STATUS } from "@/lib/labels";
import { formatPhone } from "@/lib/phone";
import { listVendorsForAdmin, parsePage, parseQuery, VENDOR_FILTERS, type VendorFilter } from "@/server/admin";
import { requireRole } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Vendors" };

export default async function AdminVendorsPage({ searchParams }: PageProps<"/admin/vendors">) {
  await requireRole("admin");
  const params = await searchParams;
  const status = (typeof params.status === "string" && params.status in VENDOR_FILTERS ? params.status : "awaiting") as VendorFilter;
  const query = parseQuery(params.q);
  const page = parsePage(params.page);
  const result = await listVendorsForAdmin({ filter: status, query, page });

  return (
    <>
      <PageHeader eyebrow="Verification" title="Vendors" description="Review identity and business documents, then verify, request information or decline." />
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs base="/admin/vendors" filters={VENDOR_FILTERS} active={status} query={query} />
        <SearchForm base="/admin/vendors" status={status} query={query} placeholder="Name, business, email, phone or CAC" />
      </div>
      <DataTable caption="Vendors" headers={["Vendor", "Category", "Phone", "Operating states", "Submitted", "Status"]}>
        {result.rows.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-4 py-10 text-center text-navy/70">
              No vendors match this view.
            </td>
          </tr>
        ) : (
          result.rows.map(({ vendor, phone }) => (
            <tr key={vendor.id} className="hover:bg-navy/[0.02]">
              <td className="px-4 py-3">
                <Link href={`/admin/vendors/${vendor.id}`} className="font-semibold text-navy underline-offset-4 hover:underline">
                  {vendor.businessName ?? vendor.legalName}
                </Link>
                {vendor.businessName && <span className="block text-[13px] text-navy/70">{vendor.legalName}</span>}
              </td>
              <td className="px-4 py-3 text-navy/80">{labelFor(VENDOR_CATEGORIES, vendor.category)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-navy/80">{formatPhone(phone)}</td>
              <td className="px-4 py-3 text-navy/80">{vendor.operatingStates.length}</td>
              <td className="px-4 py-3 whitespace-nowrap text-navy/80">{vendor.submittedAt ? formatDate(vendor.submittedAt) : "Not submitted"}</td>
              <td className="px-4 py-3">
                <StatusBadge status={vendor.verificationStatus} map={VERIFICATION_STATUS} />
              </td>
            </tr>
          ))
        )}
      </DataTable>
      <Pagination base="/admin/vendors" page={result.page} pageCount={result.pageCount} total={result.total} params={{ status, q: query }} />
    </>
  );
}
