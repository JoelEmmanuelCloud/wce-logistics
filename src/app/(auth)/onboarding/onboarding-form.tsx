"use client";

import { useActionState } from "react";
import { completeOnboardingAction } from "@/app/(auth)/actions";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { fieldsKey, initialFormState, valueOf } from "@/lib/form-state";
import type { SignUpRole } from "@/server/auth/dal";

const ROLES = [
  { value: "customer", title: "I want to ship goods", detail: "Book verified trucks for interstate loads from 50 kg." },
  { value: "vendor", title: "I own or manage trucks", detail: "List your trucks and routes, and receive paid bookings." },
] as const;

export function OnboardingForm({ defaultRole, next }: { defaultRole: SignUpRole | null; next: string | null }) {
  const [state, action] = useActionState(completeOnboardingAction, initialFormState);
  const roleErrors = state.fieldErrors?.role;

  return (
    <form action={action} className="grid gap-6" noValidate>
      <FormMessage state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <fieldset key={fieldsKey(state)} className="grid gap-3" aria-describedby={roleErrors?.length ? "role-error" : undefined}>
        <legend className="mb-1 text-[14px] font-semibold text-navy">
          How will you use WCE Logistics?<span className="text-orange-ink" aria-hidden="true"> *</span>
        </legend>
        {ROLES.map((role) => (
          <label
            key={role.value}
            className="flex cursor-pointer gap-4 rounded-xl border border-navy/15 bg-white p-4 transition-colors has-checked:border-navy has-checked:bg-navy/[0.03] has-checked:ring-1 has-checked:ring-navy has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-orange-ink"
          >
            <input
              type="radio"
              name="role"
              value={role.value}
              defaultChecked={valueOf(state.values, "role", defaultRole ?? "") === role.value}
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
      <Field id="phone" label="Mobile number" required hint="Shared with the other party on confirmed bookings so you can arrange pickup." errors={state.fieldErrors?.phone}>
        <TextInput id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" defaultValue={valueOf(state.values, "phone", "")} hasHint errors={state.fieldErrors?.phone} />
      </Field>
      <SubmitButton size="lg" pendingLabel="Saving">
        Create my account
      </SubmitButton>
    </form>
  );
}
