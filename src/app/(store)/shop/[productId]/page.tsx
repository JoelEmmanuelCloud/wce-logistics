import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { addToCartAction } from "@/app/(store)/actions";
import { ChevronLeftIcon, ShieldCheckIcon, StarIcon } from "@/components/line-icons";
import { DeliverToPicker } from "@/components/shop/deliver-to-picker";
import { ProductImage } from "@/components/shop/product-image";
import { formatKg } from "@/lib/labels";
import { formatNaira } from "@/lib/pricing";
import { deliveredUnitKobo } from "@/lib/shop";
import { readDeliverTo } from "@/server/cart";
import { getCatalogProduct } from "@/server/catalog";
import { AddToCartForm } from "./add-to-cart";

export const metadata: Metadata = { title: "Product" };

async function Product({ params }: { params: PageProps<"/shop/[productId]">["params"] }) {
  const { productId } = await params;
  const detail = /^[0-9a-f-]{36}$/i.test(productId) ? await getCatalogProduct(productId) : null;
  if (!detail) {
    notFound();
  }
  const { product, photos, rates, ratingAverage, ratingCount, unitsSold } = detail;
  const deliverTo = await readDeliverTo();
  const rate = rates.find((option) => option.destinationState === deliverTo);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
      <div className="grid content-start gap-3">
        <ProductImage photoId={photos[0]?.id ?? null} alt={product.title} sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-[4/3] rounded-2xl" />
        {photos.length > 1 && (
          <ul className="grid grid-cols-4 gap-3">
            {photos.slice(1, 5).map((photo) => (
              <li key={photo.id}>
                <ProductImage photoId={photo.id} alt={`Another view of ${product.title}`} sizes="160px" className="aspect-square rounded-xl" />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h1 className="font-display text-[clamp(34px,4vw,60px)] uppercase leading-[0.95] text-navy">{product.title}</h1>
        <p className="mt-3 text-[15px] text-navy/70">
          Sold and delivered by{" "}
          <Link href={`/shop?seller=${product.vendorId}`} className="font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4">
            {detail.sellerName}
          </Link>
          , {detail.sellerCity}, {detail.sellerState}
        </p>
        <ul className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] font-semibold text-navy/70">
          <li className="inline-flex items-center gap-1.5 text-[#05603A]">
            <ShieldCheckIcon className="size-4" />
            Verified seller
          </li>
          {ratingAverage !== null && ratingCount > 0 && (
            <li className="inline-flex items-center gap-1.5">
              <StarIcon className="size-4 text-orange-ink" />
              {ratingAverage.toFixed(1)} from {ratingCount} review{ratingCount === 1 ? "" : "s"}
            </li>
          )}
          {unitsSold > 0 && <li>{unitsSold.toLocaleString("en-NG")} sold</li>}
        </ul>
        <p className="mt-5">
          <span className="font-display text-[clamp(36px,3.4vw,52px)] leading-none text-navy">{formatNaira(product.priceKobo)}</span>
          <span className="ml-2 text-[15px] text-navy/70">per {product.unitLabel}</span>
        </p>
        <div className="mt-4 grid gap-2">
          <DeliverToPicker value={deliverTo} id="product-deliver-to" />
          {rate && (
            <p className="text-[15px] font-semibold text-orange-ink">
              {formatNaira(deliveredUnitKobo(product, rate))} per unit delivered to {deliverTo}, on the minimum order
            </p>
          )}
          {deliverTo && !rate && <p className="text-[15px] font-semibold text-orange-ink">This seller does not deliver to {deliverTo}.</p>}
        </div>

        <div className="mt-6 rounded-2xl bg-white p-5">
          {product.stockUnits === 0 ? (
            <p className="font-semibold text-orange-ink">Out of stock right now.</p>
          ) : rates.length === 0 ? (
            <p className="font-semibold text-orange-ink">This seller is not taking orders right now.</p>
          ) : (
            <AddToCartForm action={addToCartAction.bind(null, product.id)} minUnits={product.minOrderUnits} maxUnits={product.stockUnits} unitWeightKg={product.unitWeightKg} />
          )}
        </div>

        <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.12em] text-navy/70">In stock</dt>
            <dd className="mt-1 text-[15px] text-navy">{product.stockUnits.toLocaleString("en-NG")} units</dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.12em] text-navy/70">Weight per unit</dt>
            <dd className="mt-1 text-[15px] text-navy">{formatKg(product.unitWeightKg)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[12px] font-semibold uppercase tracking-[0.12em] text-navy/70">Delivers to</dt>
            <dd className="mt-1 text-[15px] text-navy">{rates.length > 0 ? rates.map((rate) => rate.destinationState).join(", ") : "No states yet"}</dd>
          </div>
        </dl>

        <h2 className="mt-8 text-[19px] font-semibold text-navy">About this product</h2>
        <p className="mt-2 whitespace-pre-line text-[16px] leading-relaxed text-navy/80">{product.description}</p>
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div role="status" aria-live="polite" className="grid animate-pulse gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
      <span className="sr-only">Loading product</span>
      <div className="aspect-[4/3] rounded-2xl bg-navy/[0.07]" />
      <div className="grid content-start gap-4">
        <div className="h-14 rounded-xl bg-navy/[0.07]" />
        <div className="h-5 w-2/3 rounded-full bg-navy/[0.07]" />
        <div className="h-40 rounded-2xl bg-navy/[0.07]" />
      </div>
    </div>
  );
}

export default function ProductPage({ params }: PageProps<"/shop/[productId]">) {
  return (
    <>
      <Link href="/shop" className="group mb-4 inline-flex items-center gap-1.5 py-1 text-[14px] font-semibold text-navy/70 transition-colors hover:text-navy">
        <ChevronLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Back to the shop
      </Link>
      <Suspense fallback={<ProductSkeleton />}>
        <Product params={params} />
      </Suspense>
    </>
  );
}
