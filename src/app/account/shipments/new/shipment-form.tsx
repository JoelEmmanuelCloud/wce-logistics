"use client";

import { useActionState } from "react";
import { createShipmentAction } from "@/app/account/shipments/actions";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/field";
import { NIGERIAN_STATES } from "@/data/nigeria-states";
import { fieldsKey, initialFormState, valueOf } from "@/lib/form-state";

function StateSelect({ id, value, errors }: { id: string; value: string; errors?: string[] }) {
  return (
    <SelectInput id={id} defaultValue={value} errors={errors}>
      <option value="" disabled>
        Choose a state
      </option>
      {NIGERIAN_STATES.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </SelectInput>
  );
}

const BOOKING_TYPES = [
  { value: "shared", title: "Shared load", detail: "Pay only for your weight on a truck already making the trip." },
  { value: "dedicated", title: "Dedicated truck", detail: "Book the whole truck for your goods alone." },
] as const;

export function ShipmentForm({
  minDate,
  maxDate,
  minWeightKg,
  cargoTypes,
}: {
  minDate: string;
  maxDate: string;
  minWeightKg: number;
  cargoTypes: ReadonlyArray<{ value: string; label: string }>;
}) {
  const [state, action] = useActionState(createShipmentAction, initialFormState);
  const errors = state.fieldErrors ?? {};
  const value = (key: string, fallback = "") => valueOf(state.values, key, fallback);

  return (
    <form action={action} className="grid gap-8" noValidate>
      <FormMessage state={state} />
      <div key={fieldsKey(state)} className="grid gap-8">
        <fieldset className="grid gap-4">
          <legend className="text-[16px] font-semibold text-navy">Pickup</legend>
          <div className="grid gap-6 md:grid-cols-[1fr_1fr_2fr]">
            <Field id="originState" label="State" required errors={errors.originState}>
              <StateSelect id="originState" value={value("originState")} errors={errors.originState} />
            </Field>
            <Field id="originCity" label="Town or city" required errors={errors.originCity}>
              <TextInput id="originCity" defaultValue={value("originCity")} errors={errors.originCity} />
            </Field>
            <Field id="originAddress" label="Pickup address" required errors={errors.originAddress}>
              <TextInput id="originAddress" autoComplete="street-address" defaultValue={value("originAddress")} errors={errors.originAddress} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="grid gap-4">
          <legend className="text-[16px] font-semibold text-navy">Delivery</legend>
          <div className="grid gap-6 md:grid-cols-[1fr_1fr_2fr]">
            <Field id="destinationState" label="State" required errors={errors.destinationState}>
              <StateSelect id="destinationState" value={value("destinationState")} errors={errors.destinationState} />
            </Field>
            <Field id="destinationCity" label="Town or city" required errors={errors.destinationCity}>
              <TextInput id="destinationCity" defaultValue={value("destinationCity")} errors={errors.destinationCity} />
            </Field>
            <Field id="destinationAddress" label="Delivery address" required errors={errors.destinationAddress}>
              <TextInput id="destinationAddress" defaultValue={value("destinationAddress")} errors={errors.destinationAddress} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="grid gap-4">
          <legend className="text-[16px] font-semibold text-navy">Cargo</legend>
          <div className="grid gap-6 md:grid-cols-3">
            <Field id="cargoType" label="Cargo type" required errors={errors.cargoType}>
              <SelectInput id="cargoType" defaultValue={value("cargoType")} errors={errors.cargoType}>
                <option value="" disabled>
                  Choose a cargo type
                </option>
                {cargoTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field id="weightKg" label="Total weight (kg)" required hint={`Minimum ${minWeightKg.toLocaleString("en-NG")} kg.`} errors={errors.weightKg}>
              <TextInput id="weightKg" inputMode="numeric" defaultValue={value("weightKg")} hasHint errors={errors.weightKg} />
            </Field>
            <Field id="packageCount" label="Number of packages" required errors={errors.packageCount}>
              <TextInput id="packageCount" inputMode="numeric" defaultValue={value("packageCount")} errors={errors.packageCount} />
            </Field>
          </div>
          <Field id="description" label="What are you sending?" required hint="For example 40 bags of cement or 12 crates of tomatoes." errors={errors.description}>
            <TextInput id="description" defaultValue={value("description")} hasHint errors={errors.description} />
          </Field>
          <div className="grid gap-6 md:grid-cols-2">
            <Field id="declaredValueKobo" label="Declared value in naira" hint="Helps with claims if something goes wrong." errors={errors.declaredValueKobo}>
              <TextInput id="declaredValueKobo" inputMode="decimal" defaultValue={value("declaredValueKobo")} hasHint errors={errors.declaredValueKobo} />
            </Field>
            <Field id="pickupDate" label="Pickup date" required hint="We show trips departing on this date or up to 3 days after." errors={errors.pickupDate}>
              <TextInput id="pickupDate" type="date" min={minDate} max={maxDate} defaultValue={value("pickupDate")} hasHint errors={errors.pickupDate} />
            </Field>
          </div>
          <Field id="handlingNotes" label="Handling notes" errors={errors.handlingNotes}>
            <TextArea id="handlingNotes" defaultValue={value("handlingNotes")} errors={errors.handlingNotes} />
          </Field>
        </fieldset>

        <fieldset className="grid gap-3" aria-describedby={errors.bookingType ? "bookingType-error" : undefined}>
          <legend className="mb-1 text-[16px] font-semibold text-navy">How do you want to ship?</legend>
          <div className="grid gap-3 md:grid-cols-2">
            {BOOKING_TYPES.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer gap-4 rounded-md border border-navy/15 bg-white p-4 transition-colors has-checked:border-navy has-checked:bg-navy/[0.03] has-checked:ring-1 has-checked:ring-navy has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-orange-ink"
              >
                <input
                  type="radio"
                  name="bookingType"
                  value={option.value}
                  defaultChecked={value("bookingType", "shared") === option.value}
                  className="mt-1 size-4 accent-[#B84A00]"
                />
                <span>
                  <span className="block text-[16px] font-semibold text-navy">{option.title}</span>
                  <span className="mt-1 block text-[14px] leading-snug text-navy/70">{option.detail}</span>
                </span>
              </label>
            ))}
          </div>
          {errors.bookingType && (
            <p id="bookingType-error" role="alert" className="text-[13px] font-medium text-[#B42318]">
              {errors.bookingType[0]}
            </p>
          )}
        </fieldset>
      </div>

      <div className="flex justify-end">
        <SubmitButton size="lg" pendingLabel="Finding trucks">
          Find trucks
        </SubmitButton>
      </div>
    </form>
  );
}
