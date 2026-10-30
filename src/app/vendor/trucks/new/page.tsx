import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/line-icons";
import { redirect } from "next/navigation";
import { createTruckAction } from "@/app/vendor/trucks/actions";
import { EMPTY_TRUCK, TruckForm } from "@/app/vendor/trucks/truck-form";
import { Card, PageHeader } from "@/components/ui/card";
import { requireRole } from "@/server/auth/dal";
import { truckFormPolicy } from "@/server/settings";
import { findVendorProfileByUser } from "@/server/vendors";

export const metadata: Metadata = { title: "Add a truck" };

export default async function NewTruckPage() {
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  if (!profile) {
    redirect("/vendor/profile");
  }
  const { categoryOptions, cargoOptions } = await truckFormPolicy();

  return (
    <>
      <Link href="/vendor/trucks" className="group inline-flex items-center gap-1.5 py-1 text-[14px] font-semibold text-navy/70 transition-colors hover:text-navy">
        <ChevronLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Back to trucks
      </Link>
      <PageHeader
        title="Add a truck"
        description="Step 3 of 3. Enter the details exactly as they appear on the vehicle documents. Next you will upload documents and photos."
      />
      <Card>
        <TruckForm
          action={createTruckAction}
          categoryOptions={categoryOptions}
          cargoOptions={cargoOptions}
          defaults={{ ...EMPTY_TRUCK, baseState: profile.state, baseCity: profile.city }}
          submitLabel="Save and continue"
        />
      </Card>
    </>
  );
}
