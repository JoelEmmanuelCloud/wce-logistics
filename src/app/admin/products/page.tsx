import type { Metadata } from "next";
import { hideProductAction, restoreProductAction } from "@/app/admin/products/actions";
import { FilterTabs, Pagination, SearchForm } from "@/components/admin/list-controls";
import { ReasonActionForm } from "@/components/marketplace/reason-action-form";
import { ProductImage } from "@/components/shop/product-image";
import { ActionButton } from "@/components/ui/action-button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PRODUCT_STATUS } from "@/lib/labels";
import { formatNaira } from "@/lib/pricing";
import { requireRole } from "@/server/auth/dal";
import { listProductsForAdmin, PRODUCT_FILTERS, type ProductFilter } from "@/server/catalog";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireRole("admin");
  const params = await searchParams;
  const status = (typeof params.status === "string" && params.status in PRODUCT_FILTERS ? params.status : "active") as ProductFilter;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);
  const result = await listProductsForAdmin({ filter: status, query, page });

  return (
    <>
      <PageHeader title="Products" description="Everything sellers list in the shop. Hide anything that breaks the rules." />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs base="/admin/products" filters={PRODUCT_FILTERS} active={status} query={query} />
        <SearchForm base="/admin/products" status={status} query={query} placeholder="Product or seller" />
      </div>
      {result.rows.length === 0 ? (
        <EmptyState title="Nothing here" description="No products match this view." />
      ) : (
        <ul className="grid gap-3">
          {result.rows.map(({ product, sellerName, photoId }) => (
            <li key={product.id} className="grid gap-4 rounded-2xl border border-navy/10 bg-white p-4 sm:grid-cols-[88px_1fr_auto] sm:items-center">
              <ProductImage photoId={photoId} alt="" sizes="88px" className="aspect-square w-[88px] rounded-xl" />
              <div className="min-w-0">
                <p className="font-semibold text-navy">{product.title}</p>
                <p className="mt-1 text-[14px] text-navy/70">
                  {sellerName}. {formatNaira(product.priceKobo)} per {product.unitLabel}, {product.stockUnits.toLocaleString("en-NG")} in stock
                </p>
                {product.statusNote && <p className="mt-1 text-[14px] text-orange-ink">{product.statusNote}</p>}
              </div>
              <div className="grid justify-items-start gap-2 sm:justify-items-end">
                <StatusBadge status={product.status} map={PRODUCT_STATUS} />
                {product.status === "hidden" ? (
                  <ActionButton action={restoreProductAction.bind(null, product.id)} label="Restore" pendingLabel="Restoring" variant="outline" />
                ) : (
                  <ReasonActionForm action={hideProductAction.bind(null, product.id)} trigger="Hide" confirmLabel="Hide product" reasonLabel="Why is this being hidden?" />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination base="/admin/products" page={result.page} pageCount={result.pageCount} total={result.total} params={{ status, q: query }} />
    </>
  );
}
