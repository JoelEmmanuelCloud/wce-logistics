"use client";

import { useActionState } from "react";
import { saveDeliveryRateAction } from "@/app/vendor/products/actions";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { NIGERIAN_STATES } from "@/data/nigeria-states";
import { fieldsKey, initialFormState, valueOf } from "@/lib/form-state";

export function DeliveryRateForm() {
  const [state, action] = useActionState(saveDeliveryRateAction, initialFormState);
  const errors = state.fieldErrors ?? {};
  const value = (key: string) => (state.status === "success" ? "" : valueOf(state.values, key, ""));

  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <div key={fieldsKey(state)} className="grid gap-5">
        <Field id="destinationState" label="Delivery state" required errors={errors.destinationState}>
          <SelectInput id="destinationState" defaultValue={value("destinationState")} errors={errors.destinationState}>
            <option value="" disabled>
              Choose a state
            </option>
            {NIGERIAN_STATES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field id="ratePerTonneKobo" label="Rate per tonne in naira" required errors={errors.ratePerTonneKobo}>
          <TextInput id="ratePerTonneKobo" inputMode="decimal" placeholder="40000" defaultValue={value("ratePerTonneKobo")} errors={errors.ratePerTonneKobo} />
        </Field>
        <Field id="minimumChargeKobo" label="Minimum delivery charge" hint="Smallest amount you charge for any order." errors={errors.minimumChargeKobo}>
          <TextInput id="minimumChargeKobo" inputMode="decimal" placeholder="15000" defaultValue={value("minimumChargeKobo")} hasHint errors={errors.minimumChargeKobo} />
        </Field>
      </div>
      <SubmitButton pendingLabel="Saving">Save rate</SubmitButton>
    </form>
  );
}
