import type { Metadata } from "next";
import { AccountForm } from "@/components/app/account-form";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { formatPhone } from "@/lib/phone";
import { site } from "@/lib/site";
import { requireRole } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireRole("customer", "driver");
  const firstName = user.fullName?.split(" ")[0];
  const contactEmail = site.contactEmail;

  return (
    <>
      <PageHeader
        eyebrow="Shipper account"
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
        description="Manage your account details. Online booking of verified trucks is being added to your dashboard."
      />
      <div className="grid gap-6">
        <Alert tone="info" title="Need to move goods now?">
          Email{" "}
          <a href={`mailto:${contactEmail}`} className="font-semibold underline decoration-orange decoration-2 underline-offset-4">
            {contactEmail}
          </a>{" "}
          with your pickup state, destination, weight and date, and our team will match you with a verified truck.
        </Alert>
        <Card>
          <CardHeader title="Account details" description="Used on your bookings and receipts." />
          <AccountForm fullName={user.fullName ?? ""} email={user.email ?? ""} phone={formatPhone(user.phone)} />
        </Card>
      </div>
    </>
  );
}
