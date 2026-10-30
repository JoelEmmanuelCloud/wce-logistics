import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/line-icons";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card, CardHeader, DescriptionList, EmptyState, PageHeader } from "@/components/ui/card";
import { requireRole } from "@/server/auth/dal";
import { findPayoutAccount } from "@/server/payout-accounts";
import { listBanks, paystackConfigured, PaystackError, type Bank } from "@/server/paystack";
import { findVendorProfileByUser } from "@/server/vendors";
import { PayoutAccountForm } from "./payout-account-form";

export const metadata: Metadata = { title: "Payout bank account" };

async function availableBanks(): Promise<Bank[] | null> {
  try {
    return await listBanks();
  } catch (error) {
    if (error instanceof PaystackError) {
      console.error(error);
      return null;
    }
    throw error;
  }
}

export default async function PayoutAccountPage() {
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  if (!profile) {
    redirect("/vendor/profile");
  }
  const account = await findPayoutAccount(profile.id);
  const banks = paystackConfigured() && profile.verificationStatus === "verified" ? await availableBanks() : null;

  return (
    <>
      <Link href="/vendor/payouts" className="group inline-flex items-center gap-1.5 py-1 text-[14px] font-semibold text-navy/70 transition-colors hover:text-navy">
        <ChevronLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Back to earnings
      </Link>
      <PageHeader
        title="Payout bank account"
        description="Your share of each completed booking is sent to this account. The account name must match your business or your own name."
      />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-6">
          {profile.verificationStatus !== "verified" ? (
            <EmptyState
              title="Verification needed"
              description="You can add a payout bank account once our team has verified your vendor account."
              action={
                <Link href="/vendor/verification" className={buttonClasses("primary")}>
                  View verification
                </Link>
              }
            />
          ) : !paystackConfigured() ? (
            <Alert tone="warning" title="Bank verification is not available yet">
              Our team pays vendors by bank transfer for now. Contact WCE Logistics support to confirm your payout account.
            </Alert>
          ) : banks === null ? (
            <Alert tone="error" title="We could not load the list of banks">
              Please refresh the page in a few minutes.
            </Alert>
          ) : (
            <Card>
              <CardHeader title={account ? "Change bank account" : "Add a bank account"} />
              <PayoutAccountForm banks={banks} defaultBankCode={account?.bankCode ?? ""} />
            </Card>
          )}
        </div>
        <div className="grid content-start gap-6">
          {account && (
            <Card>
              <CardHeader title="Current account" />
              <DescriptionList
                items={[
                  { label: "Bank", value: account.bankName },
                  { label: "Account number", value: `Ending ${account.accountNumberLast4}` },
                  { label: "Account name", value: account.accountName },
                ]}
              />
            </Card>
          )}
          <Alert tone="info" title="Keeping your account safe">
            We email you whenever this account changes. Your full account number is stored encrypted and is never shown again after you save it.
          </Alert>
        </div>
      </div>
    </>
  );
}
