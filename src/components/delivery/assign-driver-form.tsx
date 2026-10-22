"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { Field, SelectInput } from "@/components/ui/field";
import { initialFormState, type FormState } from "@/lib/form-state";

type DriverOption = { id: string; fullName: string; licenceClass: string; problem: string | null };

export function AssignDriverForm({
  action,
  drivers,
  currentDriverId,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  drivers: DriverOption[];
  currentDriverId: string | null;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const choices = drivers.filter((driver) => driver.id !== currentDriverId);
  const firstEligible = choices.find((driver) => !driver.problem);

  if (currentDriverId && choices.length === 0) {
    return (
      <div className="grid gap-3">
        <FormMessage state={state} />
        <p className="text-[14px] text-navy/70">Add another driver to your fleet if you need to change who carries this booking.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      <FormMessage state={state} />
      <Field id="driverId" label={currentDriverId ? "Change driver" : "Driver"} required errors={state.fieldErrors?.driverId}>
        <SelectInput id="driverId" defaultValue={firstEligible?.id ?? ""} errors={state.fieldErrors?.driverId}>
          <option value="" disabled>
            Choose a driver
          </option>
          {choices.map((driver) => (
            <option key={driver.id} value={driver.id} disabled={Boolean(driver.problem)}>
              {driver.fullName}, class {driver.licenceClass}
              {driver.problem ? ` (${driver.problem})` : ""}
            </option>
          ))}
        </SelectInput>
      </Field>
      <SubmitButton variant="secondary" pendingLabel="Assigning" disabled={!firstEligible}>
        {currentDriverId ? "Change driver" : "Assign driver"}
      </SubmitButton>
    </form>
  );
}
