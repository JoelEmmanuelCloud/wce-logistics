"use client";

import { useActionState } from "react";
import { cancelShipmentAction, requestBookingAction } from "@/app/account/shipments/actions";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { initialFormState } from "@/lib/form-state";

export function RequestOfferButton({ shipmentId, routeId, label }: { shipmentId: string; routeId: string; label: string }) {
  const [state, action] = useActionState(requestBookingAction.bind(null, shipmentId, routeId), initialFormState);
  return (
    <form action={action} className="grid gap-2">
      {state.status !== "idle" && <FormMessage state={state} />}
      <SubmitButton pendingLabel="Requesting" aria-label={label}>
        Request booking
      </SubmitButton>
    </form>
  );
}

export function CancelShipmentButton({ shipmentId }: { shipmentId: string }) {
  const [state, action] = useActionState(cancelShipmentAction.bind(null, shipmentId), initialFormState);
  return (
    <form action={action} className="grid gap-2">
      {state.status !== "idle" && <FormMessage state={state} />}
      <SubmitButton variant="ghost" size="sm" pendingLabel="Cancelling" className="text-[#912018]">
        Cancel shipment
      </SubmitButton>
    </form>
  );
}
