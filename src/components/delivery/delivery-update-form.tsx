"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { fieldsKey, initialFormState, type FormState } from "@/lib/form-state";

type Option = { value: string; label: string; hint: string };

export function DeliveryUpdateForm({ action, options }: { action: (state: FormState, formData: FormData) => Promise<FormState>; options: Option[] }) {
  const [state, formAction] = useActionState(action, initialFormState);
  const firstStep = options.find((option) => option.value !== "incident_reported") ?? options[0];
  const [choice, setKind] = useState(firstStep?.value ?? "");
  const errors = state.fieldErrors ?? {};
  const selected = options.find((option) => option.value === choice) ?? firstStep;
  const kind = selected?.value ?? "";
  const needsNote = kind === "delivery_attempted" || kind === "incident_reported";

  if (!selected) {
    return null;
  }

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-[14px] font-semibold text-navy">What happened?</legend>
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-navy/15 bg-white px-4 py-3 text-[15px] text-navy transition-colors has-checked:border-navy has-checked:bg-navy/[0.03] has-checked:ring-1 has-checked:ring-navy has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-orange-ink"
          >
            <input
              type="radio"
              name="kind"
              value={option.value}
              checked={kind === option.value}
              onChange={() => setKind(option.value)}
              className="mt-1 size-4 accent-[#B84A00]"
            />
            <span>
              <span className="block font-semibold">{option.label}</span>
              <span className="block text-[13px] text-navy/70">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div key={`${fieldsKey(state)}-${kind}`} className="grid gap-5">
        {kind === "delivered" && (
          <Field id="recipientName" label="Received by" required errors={errors.recipientName}>
            <TextInput id="recipientName" autoComplete="off" errors={errors.recipientName} />
          </Field>
        )}
        <Field id="note" label={needsNote ? "What happened" : "Note"} required={needsNote} errors={errors.note}>
          <TextArea id="note" rows={3} maxLength={500} errors={errors.note} />
        </Field>
        <Field id="photo" label="Photo" hint="JPG, PNG or WebP, up to 10 MB." errors={errors.photo}>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            aria-describedby={errors.photo?.length ? "photo-error" : "photo-hint"}
            className="block w-full text-[14px] text-navy file:mr-4 file:rounded-md file:border-0 file:bg-navy/[0.07] file:px-4 file:py-2 file:text-[14px] file:font-semibold file:text-navy hover:file:bg-navy/[0.12]"
          />
        </Field>
      </div>
      <SubmitButton size="lg" pendingLabel="Saving update">
        Record: {selected.label}
      </SubmitButton>
    </form>
  );
}
