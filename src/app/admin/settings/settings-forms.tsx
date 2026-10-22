"use client";

import { useActionState } from "react";
import { addCargoCategoryAction, renameCargoCategoryAction, saveSettingsAction, setCargoCategoryActiveAction } from "@/app/admin/settings/actions";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { CheckboxGroup, Field, TextInput } from "@/components/ui/field";
import { fieldsKey, initialFormState, valueOf, valuesOf } from "@/lib/form-state";

type SettingsDefaults = {
  commissionPercent: string;
  minShipmentKg: string;
  responseWindowHours: string;
  autoCompleteHours: string;
  disputeWindowDays: string;
  enabledTruckCategories: string[];
};

export function SettingsForm({ defaults, truckCategories }: { defaults: SettingsDefaults; truckCategories: ReadonlyArray<{ value: string; label: string }> }) {
  const [state, action] = useActionState(saveSettingsAction, initialFormState);
  const errors = state.fieldErrors ?? {};
  const value = (key: keyof Omit<SettingsDefaults, "enabledTruckCategories">) => valueOf(state.values, key, defaults[key]);

  return (
    <form action={action} className="grid gap-8" noValidate>
      <FormMessage state={state} />
      <div key={fieldsKey(state)} className="grid gap-8">
        <fieldset className="grid gap-6 md:grid-cols-2">
          <legend className="mb-4 text-[17px] font-semibold text-navy">Money</legend>
          <Field id="commissionPercent" label="Platform commission (%)" required hint="Taken from each payment when it is confirmed. Payments already confirmed keep their split." errors={errors.commissionPercent}>
            <TextInput id="commissionPercent" inputMode="decimal" defaultValue={value("commissionPercent")} hasHint errors={errors.commissionPercent} />
          </Field>
        </fieldset>
        <fieldset className="grid gap-6 md:grid-cols-2">
          <legend className="mb-4 text-[17px] font-semibold text-navy">Bookings</legend>
          <Field id="minShipmentKg" label="Minimum shipment weight (kg)" required hint="Shipments below this weight cannot be booked. Also the smallest trip capacity." errors={errors.minShipmentKg}>
            <TextInput id="minShipmentKg" inputMode="numeric" defaultValue={value("minShipmentKg")} hasHint errors={errors.minShipmentKg} />
          </Field>
          <Field id="responseWindowHours" label="Vendor response window (hours)" required hint="Requests not answered in time expire and release the space." errors={errors.responseWindowHours}>
            <TextInput id="responseWindowHours" inputMode="numeric" defaultValue={value("responseWindowHours")} hasHint errors={errors.responseWindowHours} />
          </Field>
          <Field id="autoCompleteHours" label="Automatic completion (hours after delivery)" required hint="Delivered bookings complete on their own after this time if no problem is reported." errors={errors.autoCompleteHours}>
            <TextInput id="autoCompleteHours" inputMode="numeric" defaultValue={value("autoCompleteHours")} hasHint errors={errors.autoCompleteHours} />
          </Field>
          <Field id="disputeWindowDays" label="Dispute window (days)" required hint="How long after completion or cancellation a problem can be reported." errors={errors.disputeWindowDays}>
            <TextInput id="disputeWindowDays" inputMode="numeric" defaultValue={value("disputeWindowDays")} hasHint errors={errors.disputeWindowDays} />
          </Field>
        </fieldset>
        <CheckboxGroup
          name="enabledTruckCategories"
          legend="Truck categories accepted for new registrations"
          options={truckCategories}
          defaultValues={valuesOf(state.values, "enabledTruckCategories", defaults.enabledTruckCategories)}
          errors={errors.enabledTruckCategories}
        />
      </div>
      <div className="flex justify-end">
        <SubmitButton size="lg" pendingLabel="Saving">
          Save settings
        </SubmitButton>
      </div>
    </form>
  );
}

export function AddCargoCategoryForm() {
  const [state, action] = useActionState(addCargoCategoryAction, initialFormState);
  return (
    <form action={action} className="grid gap-3">
      <FormMessage state={state} />
      <div key={fieldsKey(state)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field id="label" label="New cargo category" required errors={state.fieldErrors?.label}>
            <TextInput id="label" placeholder="For example Pharmaceuticals" defaultValue={state.status === "error" ? valueOf(state.values, "label", "") : ""} errors={state.fieldErrors?.label} />
          </Field>
        </div>
        <SubmitButton variant="secondary" pendingLabel="Adding" className="shrink-0">
          Add category
        </SubmitButton>
      </div>
    </form>
  );
}

export function CargoCategoryRow({ category }: { category: { value: string; label: string; active: boolean } }) {
  const [renameState, renameAction] = useActionState(renameCargoCategoryAction.bind(null, category.value), initialFormState);
  const [toggleState, toggleAction] = useActionState(setCargoCategoryActiveAction.bind(null, category.value, !category.active), initialFormState);
  const inputId = `cargo-${category.value}`;

  return (
    <li className="grid gap-3 rounded-2xl border border-navy/10 bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <form action={renameAction} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor={inputId} className="text-[13px] font-semibold text-navy">
              Name{!category.active && <span className="font-normal text-navy/70"> (retired)</span>}
            </label>
            <input
              id={inputId}
              name="label"
              key={renameState.attempt ?? "initial"}
              defaultValue={category.label}
              maxLength={60}
              className="mt-1 h-11 w-full rounded-xl border border-navy/20 bg-white px-3 text-[15px] text-navy focus:border-orange-ink focus:outline-none focus:ring-3 focus:ring-orange/25"
            />
          </div>
          <SubmitButton variant="outline" size="sm" pendingLabel="Saving">
            Rename
          </SubmitButton>
        </form>
        <form action={toggleAction}>
          <SubmitButton variant={category.active ? "ghost" : "secondary"} size="sm" pendingLabel="Saving">
            {category.active ? "Retire" : "Restore"}
          </SubmitButton>
        </form>
      </div>
      {renameState.status !== "idle" && <FormMessage state={renameState} />}
      {toggleState.status !== "idle" && <FormMessage state={toggleState} />}
    </li>
  );
}
