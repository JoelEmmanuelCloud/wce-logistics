"use client";

import { useActionState } from "react";
import { setDriverStatusAction } from "@/app/vendor/drivers/actions";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { initialFormState } from "@/lib/form-state";

export function DriverStatusButton({ driverId, status }: { driverId: string; status: "active" | "inactive" }) {
  const target = status === "active" ? "inactive" : "active";
  const [state, action] = useActionState(setDriverStatusAction.bind(null, driverId, target), initialFormState);
  return (
    <form action={action} className="grid gap-3">
      {state.status !== "idle" && <FormMessage state={state} />}
      <SubmitButton variant={target === "inactive" ? "outline" : "secondary"} pendingLabel="Saving">
        {target === "inactive" ? "Deactivate driver" : "Reactivate driver"}
      </SubmitButton>
    </form>
  );
}
