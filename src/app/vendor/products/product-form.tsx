"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/field";
import { fieldsKey, initialFormState, valueOf, type FormState } from "@/lib/form-state";

export type ProductFormValues = {
  title: string;
  description: string;
  category: string;
  unitLabel: string;
  unitWeightKg: string;
  priceKobo: string;
  stockUnits: string;
  minOrderUnits: string;
  status: string;
};

const EMPTY: ProductFormValues = { title: "", description: "", category: "", unitLabel: "", unitWeightKg: "", priceKobo: "", stockUnits: "", minOrderUnits: "1", status: "active" };

export function ProductForm({
  action,
  categories,
  initial = EMPTY,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  categories: Array<{ value: string; label: string }>;
  initial?: ProductFormValues;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const errors = state.fieldErrors ?? {};
  const value = (key: keyof ProductFormValues) => valueOf(state.values, key, initial[key]);

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <FormMessage state={state} />
      <div key={fieldsKey(state)} className="grid gap-6">
        <Field id="title" label="Product name" required errors={errors.title}>
          <TextInput id="title" defaultValue={value("title")} placeholder="Dangote cement 42.5R" errors={errors.title} />
        </Field>
        <Field id="description" label="Description" required hint="Grade, brand, packaging and anything a buyer should know." errors={errors.description}>
          <TextArea id="description" rows={4} defaultValue={value("description")} hasHint errors={errors.description} />
        </Field>
        <div className="grid gap-6 md:grid-cols-2">
          <Field id="category" label="Category" required errors={errors.category}>
            <SelectInput id="category" defaultValue={value("category")} errors={errors.category}>
              <option value="" disabled>
                Choose a category
              </option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field id="status" label="Availability" required errors={errors.status}>
            <SelectInput id="status" defaultValue={value("status")} errors={errors.status}>
              <option value="active">On sale</option>
              <option value="paused">Paused</option>
            </SelectInput>
          </Field>
        </div>
        <fieldset className="grid gap-4">
          <legend className="text-[14px] font-semibold text-navy">How it is sold</legend>
          <div className="grid gap-6 md:grid-cols-3">
            <Field id="unitLabel" label="Unit" required hint="For example 50 kg bag or 1 tonne." errors={errors.unitLabel}>
              <TextInput id="unitLabel" defaultValue={value("unitLabel")} placeholder="50 kg bag" hasHint errors={errors.unitLabel} />
            </Field>
            <Field id="unitWeightKg" label="Weight of one unit (kg)" required errors={errors.unitWeightKg}>
              <TextInput id="unitWeightKg" inputMode="numeric" defaultValue={value("unitWeightKg")} placeholder="50" errors={errors.unitWeightKg} />
            </Field>
            <Field id="priceKobo" label="Price per unit in naira" required errors={errors.priceKobo}>
              <TextInput id="priceKobo" inputMode="decimal" defaultValue={value("priceKobo")} placeholder="10500" errors={errors.priceKobo} />
            </Field>
            <Field id="stockUnits" label="Units in stock" required errors={errors.stockUnits}>
              <TextInput id="stockUnits" inputMode="numeric" defaultValue={value("stockUnits")} placeholder="400" errors={errors.stockUnits} />
            </Field>
            <Field id="minOrderUnits" label="Minimum order (units)" required errors={errors.minOrderUnits}>
              <TextInput id="minOrderUnits" inputMode="numeric" defaultValue={value("minOrderUnits")} errors={errors.minOrderUnits} />
            </Field>
          </div>
        </fieldset>
      </div>
      <div className="flex justify-end">
        <SubmitButton size="lg" pendingLabel="Saving">
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
