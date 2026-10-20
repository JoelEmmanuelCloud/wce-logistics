"use client";

import { useActionState } from "react";
import { completeOnboardingAction } from "@/app/(auth)/actions";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { initialFormState, valueOf } from "@/lib/form-state";

const ROLES = [
  { value: "customer", title: "I want to ship goods", detail: "Book verified trucks for interstate loads from 50 kg." },
  { value: "vendor", title: "I own or manage trucks", detail: "List your trucks and routes, and receive paid bookings." },
] as const;

export function OnboardingForm() {
  const [state, action] = useActionState(completeOnboardingAction, initialFormState);
  const roleErrors = state.fieldErrors?.role;

  return (
    <form action={action} className="grid gap-6" noValidate>
      <FormMessage state={state} />
      <fieldset className="grid gap-3" aria-describedby={roleErrors?.length ? "role-error" : undefined}>
        <legend className="mb-1 text-[14px] font-semibold text-navy">
          How will you use WCE Logistics?<span className="text-orange-ink"> *</span>
        </legend>
        {ROLES.map((role) => (
          <label
            key={role.value}
            className="flex cursor-pointer gap-4 rounded-2xl border border-navy/15 bg-white p-4 transition-colors has-checked:border-orange-ink has-checked:bg-orange/[0.07] has-focus-visible:ring-3 has-focus-visible:ring-orange/25"
          >
            <input
              type="radio"
              name="role"
              value={role.value}
              defaultChecked={valueOf(state.values, "role", "") === role.value}
              className="mt-1 size-4 accent-[#B84A00]"
              required
            />
            <span>
              <span className="block text-[16px] font-semibold text-navy">{role.title}</span>
              <span className="mt-1 block text-[14px] leading-snug text-navy/70">{role.detail}</span>
            </span>
          </label>
        ))}
        {roleErrors?.length ? (
          <p id="role-error" role="alert" className="text-[13px] font-medium text-[#B42318]">
            {roleErrors[0]}
          </p>
        ) : null}
      </fieldset>
      <Field id="fullName" label="Full name" required errors={state.fieldErrors?.fullName}>
        <TextInput id="fullName" autoComplete="name" defaultValue={valueOf(state.values, "fullName", "")} required errors={state.fieldErrors?.fullName} />
      </Field>
      <Field id="email" label="Email address" hint="For receipts and account notices." errors={state.fieldErrors?.email}>
        <TextInput id="email" type="email" autoComplete="email" defaultValue={valueOf(state.values, "email", "")} hasHint errors={state.fieldErrors?.email} />
      </Field>
      <SubmitButton size="lg" pendingLabel="Saving">
        Create my account
      </SubmitButton>
    </form>
  );
}
