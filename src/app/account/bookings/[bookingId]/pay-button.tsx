"use client";

import { useActionState } from "react";
import { startCheckoutAction } from "@/app/account/bookings/actions";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { initialFormState } from "@/lib/form-state";

export function PayButton({ bookingId, label }: { bookingId: string; label: string }) {
  const [state, action] = useActionState(startCheckoutAction.bind(null, bookingId), initialFormState);
  return (
    <form action={action} className="grid gap-3">
      {state.status !== "idle" && <FormMessage state={state} />}
      <SubmitButton size="lg" pendingLabel="Opening secure checkout">
        {label}
      </SubmitButton>
      <p className="text-[13px] text-navy/70">Secure card, bank transfer and USSD payment by Paystack.</p>
    </form>
  );
}
