"use client";

import { useActionState, useState } from "react";
import { saveVendorProfileAction } from "@/app/vendor/actions";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { CheckboxGroup, Field, SelectInput, TextInput } from "@/components/ui/field";
import { NIGERIAN_STATES } from "@/data/nigeria-states";
import { fieldsKey, initialFormState, valueOf, valuesOf } from "@/lib/form-state";
import { VENDOR_CATEGORIES } from "@/lib/labels";

export type ProfileDefaults = {
  category: string;
  legalName: string;
  businessName: string;
  email: string;
  addressLine: string;
  city: string;
  state: string;
  operatingStates: string[];
  cacNumber: string;
};

const STATE_OPTIONS = NIGERIAN_STATES.map((state) => ({ value: state, label: state }));

export function ProfileForm({ defaults, editable, isNew }: { defaults: ProfileDefaults; editable: boolean; isNew: boolean }) {
  const [state, action] = useActionState(saveVendorProfileAction, initialFormState);
  const [category, setCategory] = useState(defaults.category);
  const errors = state.fieldErrors ?? {};
  const value = (key: Exclude<keyof ProfileDefaults, "operatingStates">) => valueOf(state.values, key, defaults[key]);
  const isCompany = category === "logistics_company";

  return (
    <form action={action} className="grid gap-8" noValidate>
      <FormMessage state={state} />
      <fieldset key={fieldsKey(state)} disabled={!editable} className="grid gap-8 disabled:opacity-80">
        <fieldset className="grid gap-3" aria-describedby={errors.category ? "category-error" : undefined}>
          <legend className="mb-1 text-[14px] font-semibold text-navy">
            Vendor category<span className="text-orange-ink" aria-hidden="true"> *</span>
          </legend>
          <div className="grid gap-3 md:grid-cols-3">
            {VENDOR_CATEGORIES.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-navy/15 bg-white p-4 text-[15px] font-semibold text-navy transition-colors has-checked:border-navy has-checked:bg-navy/[0.03] has-checked:ring-1 has-checked:ring-navy has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-orange-ink"
              >
                <input
                  type="radio"
                  name="category"
                  value={option.value}
                  defaultChecked={value("category") === option.value}
                  onChange={() => setCategory(option.value)}
                  className="mt-0.5 size-4 accent-[#B84A00]"
                />
                {option.label}
              </label>
            ))}
          </div>
          {errors.category && (
            <p id="category-error" role="alert" className="text-[13px] font-medium text-[#B42318]">
              {errors.category[0]}
            </p>
          )}
        </fieldset>

        <div className="grid gap-6 md:grid-cols-2">
          <Field id="legalName" label="Full legal name" required hint="As it appears on your ID." errors={errors.legalName}>
            <TextInput id="legalName" autoComplete="name" defaultValue={value("legalName")} hasHint errors={errors.legalName} />
          </Field>
          <Field id="businessName" label="Business name" required={isCompany} errors={errors.businessName}>
            <TextInput id="businessName" autoComplete="organization" defaultValue={value("businessName")} errors={errors.businessName} />
          </Field>
          <Field id="email" label="Business email" required errors={errors.email}>
            <TextInput id="email" type="email" autoComplete="email" defaultValue={value("email")} errors={errors.email} />
          </Field>
          {isCompany && (
            <Field id="cacNumber" label="CAC registration number" required hint="For example RC 1234567." errors={errors.cacNumber}>
              <TextInput id="cacNumber" defaultValue={value("cacNumber")} hasHint errors={errors.cacNumber} />
            </Field>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-[2fr_1fr_1fr]">
          <Field id="addressLine" label="Business address" required errors={errors.addressLine}>
            <TextInput id="addressLine" autoComplete="street-address" defaultValue={value("addressLine")} errors={errors.addressLine} />
          </Field>
          <Field id="city" label="Town or city" required errors={errors.city}>
            <TextInput id="city" autoComplete="address-level2" defaultValue={value("city")} errors={errors.city} />
          </Field>
          <Field id="state" label="State" required errors={errors.state}>
            <SelectInput id="state" defaultValue={value("state")} errors={errors.state}>
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
        </div>

        <CheckboxGroup
          name="operatingStates"
          legend="States you operate in"
          options={STATE_OPTIONS}
          defaultValues={valuesOf(state.values, "operatingStates", defaults.operatingStates)}
          errors={errors.operatingStates}
          columns={4}
        />
      </fieldset>

      {editable && (
        <div className="flex justify-end">
          <SubmitButton size="lg" pendingLabel="Saving">
            {isNew ? "Save and continue" : "Save changes"}
          </SubmitButton>
        </div>
      )}
    </form>
  );
}
