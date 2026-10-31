"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { fieldsKey, initialFormState, valueOf, type FormState } from "@/lib/form-state";

export function AcceptOrderForm({
  action,
  trucks,
  minDate,
  maxDate,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  trucks: Array<{ id: string; label: string }>;
  minDate: string;
  maxDate: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <div key={fieldsKey(state)} className="grid gap-5">
        <Field id="truckId" label="Truck" required errors={errors.truckId}>
          <SelectInput id="truckId" defaultValue={valueOf(state.values, "truckId", trucks[0]?.id ?? "")} errors={errors.truckId}>
            {trucks.map((truck) => (
              <option key={truck.id} value={truck.id}>
                {truck.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field id="departureDate" label="Departure date" required errors={errors.departureDate}>
          <TextInput id="departureDate" type="date" min={minDate} max={maxDate} defaultValue={valueOf(state.values, "departureDate", "")} errors={errors.departureDate} />
        </Field>
        <Field id="transitHours" label="Estimated transit time (hours)" required errors={errors.transitHours}>
          <TextInput id="transitHours" inputMode="numeric" placeholder="24" defaultValue={valueOf(state.values, "transitHours", "")} errors={errors.transitHours} />
        </Field>
      </div>
      <SubmitButton size="lg" pendingLabel="Accepting">
        Accept order
      </SubmitButton>
    </form>
  );
}
