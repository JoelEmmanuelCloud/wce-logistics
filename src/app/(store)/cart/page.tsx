import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { emptyCartAction, removeCartLineAction, updateCartLineAction } from "@/app/(store)/actions";
import { ProductImage } from "@/components/shop/product-image";
import { ActionButton } from "@/components/ui/action-button";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button-classes";
import { formatKg } from "@/lib/labels";
import { formatNaira } from "@/lib/pricing";
import { loadCart } from "@/server/cart";
import { getPlatformSettings } from "@/server/settings";
import { CartQuantityForm } from "./quantity-form";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

async function Cart() {
  const [cart, settings] = await Promise.all([loadCart(), getPlatformSettings()]);
  if (cart.lines.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-navy/20 bg-white px-6 py-14 text-center">
        <h2 className="font-display text-[28px] uppercase leading-none text-navy">Your cart is empty</h2>
        <p className="mx-auto mt-3 max-w-[30em] text-[15px] leading-relaxed text-navy/70">Find what you need and we will show you the delivery price at checkout.</p>
        <Link href="/shop" className={buttonClasses("primary", "lg", "mt-6")}>
          Browse the shop
        </Link>
      </div>
    );
  }
  const underweight = cart.totals.weightKg < settings.minShipmentKg;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="grid content-start gap-3">
        {cart.seller && (
          <p className="text-[15px] text-navy/70">
            Sold and delivered by <span className="font-semibold text-navy">{cart.seller.name}</span>, from {cart.seller.city}, {cart.seller.state}
          </p>
        )}
        <ul className="grid gap-3">
          {cart.lines.map(({ product, photoId, quantity, problem }) => (
            <li key={product.id} className="grid grid-cols-[88px_1fr] gap-4 rounded-2xl border border-navy/10 bg-white p-4 sm:grid-cols-[112px_1fr_auto]">
              <ProductImage photoId={photoId} alt="" sizes="112px" className="aspect-square rounded-xl" />
              <div className="min-w-0">
                <Link href={`/shop/${product.id}`} className="font-semibold text-navy hover:text-orange-ink">
                  {product.title}
                </Link>
                <p className="mt-1 text-[14px] text-navy/70">
                  {formatNaira(product.priceKobo)} per {product.unitLabel}
                </p>
                {problem && <p className="mt-1 text-[14px] font-semibold text-orange-ink">{problem}</p>}
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <CartQuantityForm action={updateCartLineAction.bind(null, product.id)} quantity={quantity} label={`Quantity of ${product.title}`} />
                  <ActionButton action={removeCartLineAction.bind(null, product.id)} label="Remove" pendingLabel="Removing" variant="ghost" />
                </div>
              </div>
              <p className="col-span-2 text-right text-[17px] font-semibold tabular-nums text-navy sm:col-span-1">{formatNaira(product.priceKobo * quantity)}</p>
            </li>
          ))}
        </ul>
        <div className="justify-self-start">
          <ActionButton action={emptyCartAction} label="Empty cart" pendingLabel="Emptying" variant="ghost" />
        </div>
      </div>

      <aside className="content-start lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl bg-white p-5">
          <h2 className="text-[19px] font-semibold text-navy">Summary</h2>
          <dl className="mt-4 grid gap-2 text-[15px]">
            <div className="flex justify-between gap-4">
              <dt className="text-navy/70">Goods</dt>
              <dd className="tabular-nums text-navy">{formatNaira(cart.totals.goodsKobo)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-navy/70">Total weight</dt>
              <dd className="tabular-nums text-navy">{formatKg(cart.totals.weightKg)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-navy/70">Delivery</dt>
              <dd className="text-navy">At checkout</dd>
            </div>
          </dl>
          <div className="mt-4 grid gap-3">
            {underweight && (
              <Alert tone="warning" title="Add a little more">
                Orders must weigh at least {formatKg(settings.minShipmentKg)}.
              </Alert>
            )}
            {cart.ready && !underweight ? (
              <Link href="/checkout" className={buttonClasses("primary", "lg")}>
                Check out
              </Link>
            ) : (
              !underweight && (
                <Alert tone="warning" title="Fix your cart">
                  Resolve the items marked above to check out.
                </Alert>
              )
            )}
            <Link href="/shop" className="text-center text-[14px] font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4">
              Keep shopping
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div role="status" aria-live="polite" className="grid animate-pulse gap-3">
      <span className="sr-only">Loading your cart</span>
      <div className="h-32 rounded-2xl bg-navy/[0.07]" />
      <div className="h-32 rounded-2xl bg-navy/[0.07]" />
    </div>
  );
}

export default function CartPage() {
  return (
    <>
      <h1 className="mb-6 font-display text-[clamp(40px,5vw,72px)] uppercase leading-[0.92] text-navy">Your cart</h1>
      <Suspense fallback={<CartSkeleton />}>
        <Cart />
      </Suspense>
    </>
  );
}
