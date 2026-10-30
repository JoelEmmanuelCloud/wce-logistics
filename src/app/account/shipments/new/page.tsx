import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/line-icons";
import { Card, PageHeader } from "@/components/ui/card";
import { addDays, lagosToday } from "@/lib/dates";
import { MAX_BOOKING_HORIZON_DAYS } from "@/lib/validation/marketplace";
import { requireRole } from "@/server/auth/dal";
import { activeCargoCategories, getPlatformSettings } from "@/server/settings";
import { ShipmentForm } from "./shipment-form";

export const metadata: Metadata = { title: "Send a shipment" };

export default async function NewShipmentPage() {
  await requireRole("customer");
  const today = lagosToday();
  const [settings, cargoTypes] = await Promise.all([getPlatformSettings(), activeCargoCategories()]);
  return (
    <>
      <Link href="/account/shipments" className="group inline-flex items-center gap-1.5 py-1 text-[14px] font-semibold text-navy/70 transition-colors hover:text-navy">
        <ChevronLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Back to shipments
      </Link>
      <PageHeader
        title="Send a shipment"
        description="Tell us what you are moving and where. We will show verified trucks making that trip, with the full price."
      />
      <Card>
        <ShipmentForm minDate={today} maxDate={addDays(today, MAX_BOOKING_HORIZON_DAYS)} minWeightKg={settings.minShipmentKg} cargoTypes={cargoTypes} />
      </Card>
    </>
  );
}
