import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/line-icons";
import { redirect } from "next/navigation";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { lagosToday } from "@/lib/dates";
import { requireRole } from "@/server/auth/dal";
import { findVendorProfileByUser } from "@/server/vendors";
import { NewDriverForm } from "../driver-form";

export const metadata: Metadata = { title: "Add a driver" };

export default async function NewDriverPage() {
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  if (!profile) {
    redirect("/vendor/profile");
  }

  return (
    <>
      <Link href="/vendor/drivers" className="group inline-flex items-center gap-1.5 py-1 text-[14px] font-semibold text-navy/70 transition-colors hover:text-navy">
        <ChevronLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Back to drivers
      </Link>
      <PageHeader
        title="Add a driver"
        description="Drivers get their own sign-in and see only the deliveries you assign to them. They never see prices or your earnings."
      />
      {profile.verificationStatus !== "verified" ? (
        <EmptyState
          title="Verification needed"
          description="You can add drivers once our team has verified your vendor account."
          action={
            <Link href="/vendor/verification" className={buttonClasses("primary")}>
              View verification
            </Link>
          }
        />
      ) : (
        <Card>
          <NewDriverForm minDate={lagosToday()} />
        </Card>
      )}
    </>
  );
}
