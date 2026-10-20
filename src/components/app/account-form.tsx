"use client";

import { useActionState } from "react";
import { updateAccountAction } from "@/app/account/actions";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { initialFormState, valueOf } from "@/lib/form-state";

export function AccountForm({ fullName, email, phone }: { fullName: string; email: string; phone: string }) {
  const [state, action] = useActionState(updateAccountAction, initialFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-5 md:grid-cols-2">
        <Field id="fullName" label="Full name" required errors={errors.fullName}>
          <TextInput id="fullName" autoComplete="name" defaultValue={valueOf(state.values, "fullName", fullName)} errors={errors.fullName} />
        </Field>
        <Field id="phone" label="Mobile number" required errors={errors.phone}>
          <TextInput id="phone" type="tel" autoComplete="tel" defaultValue={valueOf(state.values, "phone", phone)} errors={errors.phone} />
        </Field>
        <Field id="emailDisplay" label="Email address" required hint="Your sign-in address. Contact support to change it.">
          <TextInput id="emailDisplay" value={email} readOnly disabled hasHint />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton variant="secondary" pendingLabel="Saving">
          Save details
        </SubmitButton>
      </div>
    </form>
  );
}
