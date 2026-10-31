import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { removeDeliveryRateAction } from "@/app/vendor/products/actions";
import { ActionButton } from "@/components/ui/action-button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { formatNaira } from "@/lib/pricing";
import { requireRole } from "@/server/auth/dal";
import { listDeliveryRates } from "@/server/catalog";
import { findVendorProfileByUser } from "@/server/vendors";
import { DeliveryRateForm } from "./rate-form";

export const metadata: Metadata = { title: "Delivery rates" };

export default async function DeliveryRatesPage() {
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  if (!profile) {
    redirect("/vendor/profile");
  }
  const rates = await listDeliveryRates(profile.id);

  return (
    <>
      <PageHeader title="Delivery rates" description={`What you charge to deliver from ${profile.city}, ${profile.state}. Buyers can only order for delivery to states listed here.`} />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader title="Add or update a state" description="Saving a state that is already listed replaces its rate." />
          <DeliveryRateForm />
        </Card>
        <Card>
          <CardHeader title="States you deliver to" />
          {rates.length === 0 ? (
            <p className="text-[15px] text-navy/70">No states yet. Add one to start taking orders.</p>
          ) : (
            <ul className="divide-y divide-navy/10">
              {rates.map((rate) => (
                <li key={rate.id} className="flex items-center justify-between gap-4 py-3">
                  <span>
                    <span className="block font-semibold text-navy">{rate.destinationState}</span>
                    <span className="text-[14px] text-navy/70">
                      {formatNaira(rate.ratePerTonneKobo)} per tonne
                      {rate.minimumChargeKobo > 0 && `, minimum ${formatNaira(rate.minimumChargeKobo)}`}
                    </span>
                  </span>
                  <ActionButton action={removeDeliveryRateAction.bind(null, rate.id)} label="Remove" pendingLabel="Removing" variant="outline" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
