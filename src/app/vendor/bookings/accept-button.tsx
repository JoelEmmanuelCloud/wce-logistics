"use client";

import { useActionState } from "react";
import { acceptBookingAction } from "@/app/vendor/bookings/actions";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { initialFormState } from "@/lib/form-state";

export function AcceptButton({ bookingId }: { bookingId: string }) {
  const [state, action] = useActionState(acceptBookingAction.bind(null, bookingId), initialFormState);
  return (
    <form action={action} className="grid gap-3">
      {state.status !== "idle" && <FormMessage state={state} />}
      <SubmitButton variant="secondary" pendingLabel="Accepting">
        Accept booking
      </SubmitButton>
    </form>
  );
}
