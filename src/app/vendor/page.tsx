import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { VendorStatusBanner } from "@/components/app/vendor-status-banner";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { VERIFICATION_STATUS } from "@/lib/labels";
import { requireRole } from "@/server/auth/dal";
import { listBookings } from "@/server/marketplace";
import { countVendorTrucks, findVendorProfileByUser } from "@/server/vendors";

export const metadata: Metadata = { title: "Overview" };

function Step({
  number,
  title,
  description,
  status,
  href,
  cta,
}: {
  number: number;
  title: string;
  description: string;
  status: ReactNode;
  href: string;
  cta: string;
}) {
  return (
    <li className="flex flex-col gap-4 rounded-lg border border-navy/10 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-navy font-display text-[18px] text-white">{number}</span>
        <div>
          <h2 className="text-[17px] font-semibold text-navy">{title}</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-navy/70">{description}</p>
          <div className="mt-2">{status}</div>
        </div>
      </div>
      <Link href={href} className={buttonClasses("outline", "sm", "shrink-0")}>
        {cta}
      </Link>
    </li>
  );
}

export default async function VendorOverviewPage() {
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  const trucks = profile ? await countVendorTrucks(profile.id) : { total: 0, active: 0 };
  const requests = profile ? await listBookings({ vendorId: profile.id, statuses: ["pending_vendor_acceptance"] }) : [];
  const firstName = user.fullName?.split(" ")[0];

  return (
    <>
      <PageHeader
        eyebrow="Vendor dashboard"
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
        description="Get verified, add your trucks, and you are ready to receive bookings on the routes you run."
      />

      {requests.length > 0 && (
        <div className="mb-4">
          <Alert tone="warning" title={`${requests.length} booking request${requests.length === 1 ? "" : "s"} waiting`}>
            Shippers are waiting for your answer.{" "}
            <Link href="/vendor/bookings" className="font-semibold underline decoration-orange decoration-2 underline-offset-4">
              Review requests
            </Link>
          </Alert>
        </div>
      )}
      {profile && (
        <div className="mb-6">
          <VendorStatusBanner profile={profile} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <ol className="grid gap-3">
          <Step
            number={1}
            title="Business profile"
            description="Who you are, how to reach you and the states you operate in."
            status={
              <span className="text-[13px] font-semibold text-navy/70">{profile ? "Completed" : "Not started"}</span>
            }
            href="/vendor/profile"
            cta={profile ? "Review" : "Start"}
          />
          <Step
            number={2}
            title="Verification"
            description="Identity details and supporting documents, reviewed by our team."
            status={profile ? <StatusBadge status={profile.verificationStatus} map={VERIFICATION_STATUS} /> : <span className="text-[13px] text-navy/70">Complete step 1 first</span>}
            href={profile ? "/vendor/verification" : "/vendor/profile"}
            cta={profile?.verificationStatus === "draft" || profile?.verificationStatus === "info_required" ? "Continue" : "View"}
          />
          <Step
            number={3}
            title="Trucks"
            description="Register each truck with its documents and photos for review."
            status={
              <span className="text-[13px] font-semibold text-navy/70">
                {trucks.total === 0 ? "No trucks yet" : `${trucks.total} registered, ${trucks.active} active`}
              </span>
            }
            href="/vendor/trucks"
            cta={trucks.total === 0 ? "Add a truck" : "Manage"}
          />
        </ol>

        <Card tone="dark">
          <p className="font-display text-[44px] uppercase leading-none">
            {trucks.active}
            <span className="ml-2 text-[20px] text-orange">active</span>
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-white/75">
            Active trucks are verified, documented and visible to shippers searching your routes.
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/15 pt-5">
            <div>
              <dt className="text-[12px] uppercase tracking-[0.12em] text-white/60">Registered</dt>
              <dd className="mt-1 text-[22px] font-semibold">{trucks.total}</dd>
            </div>
            <div>
              <dt className="text-[12px] uppercase tracking-[0.12em] text-white/60">Operating states</dt>
              <dd className="mt-1 text-[22px] font-semibold">{profile?.operatingStates.length ?? 0}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </>
  );
}
