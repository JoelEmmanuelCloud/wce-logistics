"use client";

import { useActionState } from "react";
import { createDriverAction, updateDriverAction } from "@/app/vendor/drivers/actions";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { fieldsKey, initialFormState, valueOf } from "@/lib/form-state";
import { LICENCE_CLASSES } from "@/lib/labels";

function LicenceFields({ errors, value, minDate }: { errors: Record<string, string[] | undefined>; value: (key: string, fallback?: string) => string; minDate: string }) {
  return (
    <>
      <Field id="licenceClass" label="Licence class" required hint="The class printed on the driver's FRSC licence." errors={errors.licenceClass}>
        <SelectInput id="licenceClass" defaultValue={value("licenceClass")} hasHint errors={errors.licenceClass}>
          <option value="" disabled>
            Choose a class
          </option>
          {LICENCE_CLASSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field id="licenceExpiresOn" label="Licence expiry date" required errors={errors.licenceExpiresOn}>
        <TextInput id="licenceExpiresOn" type="date" min={minDate} defaultValue={value("licenceExpiresOn")} errors={errors.licenceExpiresOn} />
      </Field>
    </>
  );
}

export function NewDriverForm({ minDate }: { minDate: string }) {
  const [state, action] = useActionState(createDriverAction, initialFormState);
  const errors = state.fieldErrors ?? {};
  const value = (key: string, fallback = "") => valueOf(state.values, key, fallback);

  return (
    <form action={action} className="grid gap-8" noValidate>
      <FormMessage state={state} />
      <div key={fieldsKey(state)} className="grid gap-6 md:grid-cols-2">
        <Field id="fullName" label="Full name" required errors={errors.fullName}>
          <TextInput id="fullName" autoComplete="off" defaultValue={value("fullName")} errors={errors.fullName} />
        </Field>
        <Field id="email" label="Email address" required hint="The driver signs in with this email. It cannot belong to another account." errors={errors.email}>
          <TextInput id="email" type="email" autoComplete="off" defaultValue={value("email")} hasHint errors={errors.email} />
        </Field>
        <Field id="phone" label="Mobile number" required hint="Shared with the shipper once the driver is assigned." errors={errors.phone}>
          <TextInput id="phone" type="tel" inputMode="tel" placeholder="0803 123 4567" defaultValue={value("phone")} hasHint errors={errors.phone} />
        </Field>
        <Field id="licenceNumber" label="Driver's licence number" required hint="Stored encrypted. Only the last four characters are shown." errors={errors.licenceNumber}>
          <TextInput id="licenceNumber" autoComplete="off" defaultValue={value("licenceNumber")} hasHint errors={errors.licenceNumber} />
        </Field>
        <LicenceFields errors={errors} value={value} minDate={minDate} />
      </div>
      <div className="flex justify-end">
        <SubmitButton size="lg" pendingLabel="Adding driver">
          Add driver
        </SubmitButton>
      </div>
    </form>
  );
}

export function EditDriverForm({
  driverId,
  defaults,
  minDate,
}: {
  driverId: string;
  defaults: { phone: string; licenceClass: string; licenceExpiresOn: string };
  minDate: string;
}) {
  const [state, action] = useActionState(updateDriverAction.bind(null, driverId), initialFormState);
  const errors = state.fieldErrors ?? {};
  const value = (key: string, fallback?: string) => valueOf(state.values, key, fallback ?? defaults[key as keyof typeof defaults] ?? "");

  return (
    <form action={action} className="grid gap-6" noValidate>
      <FormMessage state={state} />
      <div key={fieldsKey(state)} className="grid gap-6 md:grid-cols-3">
        <Field id="phone" label="Mobile number" required errors={errors.phone}>
          <TextInput id="phone" type="tel" inputMode="tel" defaultValue={value("phone")} errors={errors.phone} />
        </Field>
        <LicenceFields errors={errors} value={value} minDate={minDate} />
      </div>
      <div className="flex justify-end">
        <SubmitButton variant="secondary" pendingLabel="Saving">
          Save changes
        </SubmitButton>
      </div>
    </form>
  );
}
