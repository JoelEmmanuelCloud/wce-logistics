import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/line-icons";
import { notFound, redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader, DescriptionList, PageHeader } from "@/components/ui/card";
import { EmailLink, PhoneLink } from "@/components/ui/contact-link";
import { StatusBadge } from "@/components/ui/status-badge";
import { lagosToday } from "@/lib/dates";
import { BOOKING_STATUS, DRIVER_STATUS, formatDate, labelFor, LICENCE_CLASSES } from "@/lib/labels";
import { formatPhone } from "@/lib/phone";
import { requireRole } from "@/server/auth/dal";
import { listDriverDeliveries } from "@/server/delivery";
import { findVendorDriver } from "@/server/drivers";
import { findVendorProfileByUser } from "@/server/vendors";
import { EditDriverForm } from "../driver-form";
import { DriverStatusButton } from "../driver-status-button";

export const metadata: Metadata = { title: "Driver" };

export default async function VendorDriverPage({ params }: PageProps<"/vendor/drivers/[driverId]">) {
  const { driverId } = await params;
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  if (!profile) {
    redirect("/vendor/profile");
  }
  const row = /^[0-9a-f-]{36}$/i.test(driverId) ? await findVendorDriver(profile.id, driverId) : null;
  if (!row) {
    notFound();
  }
  const { driver, email } = row;
  const deliveries = await listDriverDeliveries(driver.id, "active");
  const today = lagosToday();
  const expired = driver.licenceExpiresOn < today;

  return (
    <>
      <Link href="/vendor/drivers" className="group inline-flex items-center gap-1.5 py-1 text-[14px] font-semibold text-navy/70 transition-colors hover:text-navy">
        <ChevronLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Back to drivers
      </Link>
      <PageHeader title={driver.fullName} action={<StatusBadge status={driver.status} map={DRIVER_STATUS} />} />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-6">
          {expired && (
            <Alert tone="error" title="Licence expired">
              This driver cannot be assigned to new bookings until you record a renewed licence.
            </Alert>
          )}
          <Card>
            <CardHeader title="Details" />
            <DescriptionList
              items={[
                { label: "Sign-in email", value: <EmailLink email={email} /> },
                { label: "Mobile number", value: <PhoneLink phone={driver.phone} /> },
                { label: "Licence number", value: `Ending ${driver.licenceNumberLast4}` },
                { label: "Licence class", value: labelFor(LICENCE_CLASSES, driver.licenceClass) },
                { label: "Licence expiry", value: formatDate(driver.licenceExpiresOn) },
              ]}
            />
          </Card>
          <Card>
            <CardHeader title="Update details" description="Record a renewed licence or a new phone number." />
            <EditDriverForm
              driverId={driver.id}
              minDate={today}
              defaults={{ phone: formatPhone(driver.phone), licenceClass: driver.licenceClass, licenceExpiresOn: driver.licenceExpiresOn }}
            />
          </Card>
        </div>
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="Deliveries in progress" />
            {deliveries.length === 0 ? (
              <p className="text-[15px] text-navy/70">No deliveries assigned right now.</p>
            ) : (
              <ul className="grid gap-3">
                {deliveries.map((delivery) => (
                  <li key={delivery.booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-navy/10 p-4">
                    <div>
                      <Link href={`/vendor/bookings/${delivery.booking.id}`} className="font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4">
                        {delivery.booking.reference}
                      </Link>
                      <p className="mt-1 text-[13px] text-navy/70">
                        {delivery.originCity} to {delivery.destinationCity}, departs {formatDate(delivery.departureDate)}
                      </p>
                    </div>
                    <StatusBadge status={delivery.booking.status} map={BOOKING_STATUS} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card tone={driver.status === "active" ? "danger" : "light"}>
            <CardHeader
              title={driver.status === "active" ? "Deactivate driver" : "Reactivate driver"}
              description={
                driver.status === "active"
                  ? "Inactive drivers cannot sign in to see deliveries or be assigned to bookings."
                  : "Reactivated drivers can be assigned to bookings again."
              }
            />
            <DriverStatusButton driverId={driver.id} status={driver.status} />
          </Card>
        </div>
      </div>
    </>
  );
}
