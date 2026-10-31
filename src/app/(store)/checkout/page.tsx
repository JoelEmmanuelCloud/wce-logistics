import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser, homePathFor } from "@/server/auth/dal";
import { loadCart } from "@/server/cart";
import { getPlatformSettings } from "@/server/settings";
import { Alert } from "@/components/ui/alert";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

async function Checkout() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?as=customer&next=/checkout");
  }
  if (!user.role) {
    redirect("/onboarding?as=customer&next=/checkout");
  }
  if (user.role !== "customer") {
    return (
      <Alert tone="warning" title="Use a buyer account to order">
        You are signed in as a {user.role}. Sign out and sign in with a buyer account to check out, or go to <a href={homePathFor(user)} className="font-semibold underline underline-offset-4">your dashboard</a>.
      </Alert>
    );
  }
  const [cart, settings] = await Promise.all([loadCart(), getPlatformSettings()]);
  if (!cart.ready || !cart.seller || cart.totals.weightKg < settings.minShipmentKg) {
    redirect("/cart");
  }
  return (
    <CheckoutForm
      sellerName={cart.seller.name}
      origin={`${cart.seller.city}, ${cart.seller.state}`}
      lines={cart.lines.map(({ product, quantity }) => ({ id: product.id, title: product.title, unitLabel: product.unitLabel, unitPriceKobo: product.priceKobo, unitWeightKg: product.unitWeightKg, quantity }))}
      rates={cart.rates.map((rate) => ({ state: rate.destinationState, ratePerTonneKobo: rate.ratePerTonneKobo, minimumChargeKobo: rate.minimumChargeKobo }))}
    />
  );
}

export default function CheckoutPage() {
  return (
    <>
      <h1 className="mb-6 font-display text-[clamp(40px,5vw,72px)] uppercase leading-[0.92] text-navy">Checkout</h1>
      <Suspense fallback={<div role="status" className="h-96 animate-pulse rounded-2xl bg-navy/[0.07]"><span className="sr-only">Loading checkout</span></div>}>
        <Checkout />
      </Suspense>
    </>
  );
}
