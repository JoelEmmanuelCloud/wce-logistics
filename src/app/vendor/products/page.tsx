import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/admin/list-controls";
import { ProductImage } from "@/components/shop/product-image";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button-classes";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PRODUCT_STATUS } from "@/lib/labels";
import { formatNaira } from "@/lib/pricing";
import { parsePage } from "@/server/admin";
import { requireRole } from "@/server/auth/dal";
import { listDeliveryRates, listProductsForVendor } from "@/server/catalog";
import { findVendorProfileByUser } from "@/server/vendors";

export const metadata: Metadata = { title: "Products" };

export default async function VendorProductsPage({ searchParams }: PageProps<"/vendor/products">) {
  const user = await requireRole("vendor");
  const params = await searchParams;
  const profile = await findVendorProfileByUser(user.id);
  const [result, rates] = profile ? await Promise.all([listProductsForVendor(profile.id, parsePage(params.page)), listDeliveryRates(profile.id)]) : [null, []];
  const total = result?.total ?? 0;
  const addProduct = (
    <Link href={profile ? "/vendor/products/new" : "/vendor/profile"} className={buttonClasses("primary")}>
      {profile ? "Add a product" : "Complete your profile first"}
    </Link>
  );

  return (
    <>
      <PageHeader title="Products" description="List the goods you sell. You deliver every order with your own verified trucks." action={total > 0 ? addProduct : undefined} />
      <div className="grid gap-4">
        {profile && profile.verificationStatus !== "verified" && (
          <Alert tone="info" title="Not visible in the shop yet">
            Your products appear in the shop once our team has verified your vendor account.
          </Alert>
        )}
        {profile && rates.length === 0 && (
          <Alert tone="warning" title="Set your delivery rates">
            Buyers can only order from you once you set a delivery rate for at least one state.{" "}
            <Link href="/vendor/delivery-rates" className="font-semibold underline underline-offset-4">
              Set delivery rates
            </Link>
          </Alert>
        )}
        {!result || total === 0 ? (
          <EmptyState title="No products yet" description="Add your first product with its price, stock and photos." action={addProduct} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.rows.map(({ product, photoId }) => (
              <li key={product.id}>
                <Link
                  href={`/vendor/products/${product.id}`}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-navy/10 bg-white transition-colors hover:border-navy/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
                >
                  <ProductImage photoId={photoId} alt="" sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw" className="aspect-[16/10]" />
                  <span className="flex flex-1 flex-col gap-3 p-5">
                    <span className="flex items-start justify-between gap-3">
                      <span className="text-[17px] font-semibold text-navy">{product.title}</span>
                      <StatusBadge status={product.status} map={PRODUCT_STATUS} />
                    </span>
                    <span className="mt-auto flex items-baseline justify-between gap-3 text-[14px] text-navy/70">
                      <span>
                        <span className="text-[16px] font-semibold text-navy">{formatNaira(product.priceKobo)}</span> per {product.unitLabel}
                      </span>
                      <span className={product.stockUnits === 0 ? "font-semibold text-orange-ink" : ""}>{product.stockUnits.toLocaleString("en-NG")} in stock</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {result && total > 0 && <Pagination base="/vendor/products" page={result.page} pageCount={result.pageCount} total={total} params={{}} />}
    </>
  );
}
