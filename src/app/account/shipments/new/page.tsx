import type { Metadata } from "next";
import Link from "next/link";
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
      <Link href="/account/shipments" className="text-[14px] font-semibold text-navy/70 hover:text-navy">
        Back to shipments
      </Link>
      <PageHeader
        eyebrow="Book a truck"
        title="Send a shipment"
        description="Tell us what you are moving and where. We will show verified trucks making that trip, with the full price."
      />
      <Card>
        <ShipmentForm minDate={today} maxDate={addDays(today, MAX_BOOKING_HORIZON_DAYS)} minWeightKg={settings.minShipmentKg} cargoTypes={cargoTypes} />
      </Card>
    </>
  );
}
