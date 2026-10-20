"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { CheckboxGroup, Field, SelectInput, TextInput } from "@/components/ui/field";
import { NIGERIAN_STATES } from "@/data/nigeria-states";
import { initialFormState, valueOf, valuesOf, type FormState } from "@/lib/form-state";
import { BODY_TYPES, CARGO_TYPES, TRUCK_CATEGORIES } from "@/lib/labels";

export type TruckDefaults = {
  registrationNumber: string;
  make: string;
  model: string;
  year: string;
  category: string;
  tyreCount: string;
  maxPayloadKg: string;
  bodyType: string;
  bodyLengthM: string;
  bodyWidthM: string;
  bodyHeightM: string;
  cargoTypes: string[];
  baseState: string;
  baseCity: string;
};

export const EMPTY_TRUCK: TruckDefaults = {
  registrationNumber: "",
  make: "",
  model: "",
  year: "",
  category: "",
  tyreCount: "",
  maxPayloadKg: "",
  bodyType: "",
  bodyLengthM: "",
  bodyWidthM: "",
  bodyHeightM: "",
  cargoTypes: [],
  baseState: "",
  baseCity: "",
};

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function TruckForm({ action, defaults, submitLabel, disabled = false }: { action: Action; defaults: TruckDefaults; submitLabel: string; disabled?: boolean }) {
  const [state, formAction] = useActionState(action, initialFormState);
  const errors = state.fieldErrors ?? {};
  const value = (key: Exclude<keyof TruckDefaults, "cargoTypes">) => valueOf(state.values, key, defaults[key]);

  return (
    <form action={formAction} className="grid gap-8" noValidate>
      <FormMessage state={state} />
      <fieldset disabled={disabled} className="grid gap-8">
        <div className="grid gap-6 md:grid-cols-3">
          <Field id="registrationNumber" label="Registration number" required hint="As shown on the number plate." errors={errors.registrationNumber}>
            <TextInput
              id="registrationNumber"
              autoComplete="off"
              spellCheck={false}
              className="uppercase"
              defaultValue={value("registrationNumber")}
              hasHint
              errors={errors.registrationNumber}
            />
          </Field>
          <Field id="make" label="Make" required errors={errors.make}>
            <TextInput id="make" placeholder="MAN, DAF, Mercedes-Benz" defaultValue={value("make")} errors={errors.make} />
          </Field>
          <Field id="model" label="Model" required errors={errors.model}>
            <TextInput id="model" defaultValue={value("model")} errors={errors.model} />
          </Field>
          <Field id="year" label="Year" errors={errors.year}>
            <TextInput id="year" inputMode="numeric" defaultValue={value("year")} errors={errors.year} />
          </Field>
          <Field id="category" label="Truck category" required errors={errors.category}>
            <SelectInput id="category" defaultValue={value("category")} errors={errors.category}>
              <option value="" disabled>
                Choose a category
              </option>
              {TRUCK_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field id="bodyType" label="Cargo body type" required errors={errors.bodyType}>
            <SelectInput id="bodyType" defaultValue={value("bodyType")} errors={errors.bodyType}>
              <option value="" disabled>
                Choose a body type
              </option>
              {BODY_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Field
            id="maxPayloadKg"
            label="Maximum permitted payload (kg)"
            required
            hint="The legal payload on the vehicle documents, not an estimate from tyre count."
            errors={errors.maxPayloadKg}
          >
            <TextInput id="maxPayloadKg" inputMode="numeric" defaultValue={value("maxPayloadKg")} hasHint errors={errors.maxPayloadKg} />
          </Field>
          <Field id="tyreCount" label="Number of tyres" required errors={errors.tyreCount}>
            <TextInput id="tyreCount" inputMode="numeric" defaultValue={value("tyreCount")} errors={errors.tyreCount} />
          </Field>
        </div>

        <fieldset className="grid gap-3">
          <legend className="text-[14px] font-semibold text-navy">
            Cargo body dimensions in metres <span className="font-normal text-navy/60">(optional)</span>
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="bodyLengthM" label="Length" errors={errors.bodyLengthM}>
              <TextInput id="bodyLengthM" inputMode="decimal" defaultValue={value("bodyLengthM")} errors={errors.bodyLengthM} />
            </Field>
            <Field id="bodyWidthM" label="Width" errors={errors.bodyWidthM}>
              <TextInput id="bodyWidthM" inputMode="decimal" defaultValue={value("bodyWidthM")} errors={errors.bodyWidthM} />
            </Field>
            <Field id="bodyHeightM" label="Height" errors={errors.bodyHeightM}>
              <TextInput id="bodyHeightM" inputMode="decimal" defaultValue={value("bodyHeightM")} errors={errors.bodyHeightM} />
            </Field>
          </div>
        </fieldset>

        <CheckboxGroup
          name="cargoTypes"
          legend="Cargo this truck can carry"
          options={CARGO_TYPES}
          defaultValues={valuesOf(state.values, "cargoTypes", defaults.cargoTypes)}
          errors={errors.cargoTypes}
          columns={4}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <Field id="baseState" label="Base state" required errors={errors.baseState}>
            <SelectInput id="baseState" defaultValue={value("baseState")} errors={errors.baseState}>
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
          <Field id="baseCity" label="Base town or city" required errors={errors.baseCity}>
            <TextInput id="baseCity" defaultValue={value("baseCity")} errors={errors.baseCity} />
          </Field>
        </div>
      </fieldset>

      {!disabled && (
        <div className="flex justify-end">
          <SubmitButton size="lg" pendingLabel="Saving">
            {submitLabel}
          </SubmitButton>
        </div>
      )}
    </form>
  );
}
