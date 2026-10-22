"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { errorState, validationErrorState, withValues, type FormState } from "@/lib/form-state";
import { payoutAccountSchema } from "@/lib/validation/vendor";
import { requireRole } from "@/server/auth/dal";
import { notifyPayoutAccountChanged } from "@/server/notifications";
import { describeAccount, PayoutAccountError, savePayoutAccount } from "@/server/payout-accounts";
import { paystackConfigured } from "@/server/paystack";
import { findVendorProfileByUser } from "@/server/vendors";

export async function savePayoutAccountAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  if (!profile) {
    redirect("/vendor/profile");
  }
  if (profile.verificationStatus !== "verified") {
    return errorState("Your vendor account must be verified before you add a payout bank account.");
  }
  if (!paystackConfigured()) {
    return errorState("Bank accounts cannot be verified right now. Contact WCE Logistics support.");
  }
  const parsed = payoutAccountSchema.safeParse({ bankCode: formData.get("bankCode") ?? "", accountNumber: formData.get("accountNumber") ?? "" });
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }
  try {
    const account = await savePayoutAccount(profile.id, user.id, parsed.data);
    after(() => notifyPayoutAccountChanged(profile.id, describeAccount(account)));
  } catch (error) {
    if (error instanceof PayoutAccountError) {
      return withValues(errorState(error.message), formData);
    }
    throw error;
  }
  redirect("/vendor/payouts?account=saved");
}
